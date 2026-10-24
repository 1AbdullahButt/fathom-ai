// LLM access (PLAN.md Architecture: external APIs behind lib/llm.ts).
// Groq chat completions (OpenAI-compatible REST) in JSON mode, over an ordered model chain
// (GROQ_MODELS) because Groq rate limits are per model. LLM_MOCK=1 skips the network
// and returns fixture-shaped output (e2e/CI). If Groq stays rate-limited and ANTHROPIC_API_KEY
// is set, falls back to Claude.
import expected1 from "../tests/fixtures/meeting1.expected.json";
import expected2 from "../tests/fixtures/meeting2.expected.json";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface JsonRequest {
  messages: ChatMessage[];
  /** Used instead of the network when LLM_MOCK=1. */
  mock: () => unknown;
  maxTokens?: number;
}

/** Thrown when the model answers but the content is not valid JSON. Callers may retry. */
export class LlmJsonError extends Error {
  constructor(
    message: string,
    readonly content: string,
  ) {
    super(message);
  }
}

class RateLimitedError extends Error {}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Groq rate limits (including the free tier's daily token cap) are per model, so we try an
// ordered chain and move on when one is spent. GROQ_MODELS (comma list) overrides it; the
// older single GROQ_MODEL still works.
const DEFAULT_GROQ_MODELS = "openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 4;
/** A 429 asking for a longer wait than this means "this model is spent": try the next one. */
const SHORT_WAIT_S = 20;

export function groqModels(): string[] {
  const raw = process.env.GROQ_MODELS || process.env.GROQ_MODEL || DEFAULT_GROQ_MODELS;
  return raw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

export function isMock(): boolean {
  return process.env.LLM_MOCK === "1" || process.env.LLM_MOCK === "true";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Seconds from retry-after, else from Groq's "Please try again in 1m2.5s" text. NaN if absent. */
function retryAfterSeconds(res: Response, detail: string): number {
  const h = res.headers.get("retry-after");
  const n = h ? Number(h) : NaN;
  if (Number.isFinite(n) && n >= 0) return n;
  const m = /try again in\s+((?:[\d.]+(?:ms|h|m|s))+)/i.exec(detail);
  if (!m) return NaN;
  const unit: Record<string, number> = { h: 3600, m: 60, s: 1, ms: 0.001 };
  let total = 0;
  for (const [, v, u] of m[1].matchAll(/([\d.]+)(ms|h|m|s)/g)) total += Number(v) * unit[u];
  return total;
}

function isDailyLimit(detail: string): boolean {
  return /per day|\bTPD\b|\bRPD\b|daily/i.test(detail);
}

function parseJson(content: string): unknown {
  const text = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(text);
  } catch {
    // Without JSON mode a model may wrap the object in prose: take the outermost braces.
    const a = text.indexOf("{");
    const b = text.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(text.slice(a, b + 1));
      } catch {
        /* fall through */
      }
    }
    throw new LlmJsonError("model returned invalid JSON", content);
  }
}

/** Models that rejected response_format json_object in this process; they get a plain prompt. */
const noJsonMode = new Set<string>();

function rejectsJsonMode(status: number, detail: string): boolean {
  return (
    status === 400 &&
    !detail.includes("json_validate_failed") &&
    /response_format|json_object|json mode/i.test(detail)
  );
}

/** One model. Throws RateLimitedError when this model is spent (caller moves on). */
async function groqModel(key: string, model: string, messages: ChatMessage[], maxTokens: number): Promise<string> {
  let shortRetried = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const jsonMode = !noJsonMode.has(model);
    const msgs: ChatMessage[] = jsonMode
      ? messages
      : [...messages, { role: "user", content: "Respond with a single JSON object and nothing else." }];
    const body: Record<string, unknown> = { model, messages: msgs, temperature: 0.2, max_tokens: maxTokens };
    if (jsonMode) body.response_format = { type: "json_object" };
    if (model.startsWith("openai/gpt-oss")) {
      body.reasoning_effort = "medium";
      body.include_reasoning = false;
    }

    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`Groq ${model} request failed: ${(e as Error).message}`);
      await sleep(1000 * attempt);
      continue;
    }
    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error(`Groq ${model} returned no content`);
      return content;
    }
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429) {
      const wait = retryAfterSeconds(res, detail);
      // Daily cap or long wait: this model is spent for now. Short wait: retry it once.
      if (shortRetried || isDailyLimit(detail) || !(wait <= SHORT_WAIT_S)) {
        throw new RateLimitedError(`Groq rate-limited (${model}): ${detail}`);
      }
      shortRetried = true;
      await sleep((wait + 0.5) * 1000);
      continue;
    }
    if (res.status >= 500) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`Groq ${model} ${res.status}: ${detail}`);
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (jsonMode && rejectsJsonMode(res.status, detail)) {
      noJsonMode.add(model);
      continue;
    }
    // A JSON-mode failure ("json_validate_failed") is a model output problem: let the caller retry.
    if (res.status === 400 && detail.includes("json_validate_failed")) {
      throw new LlmJsonError("model returned invalid JSON", detail);
    }
    throw new Error(`Groq ${model} ${res.status}: ${detail}`);
  }
  throw new Error(`Groq ${model}: no answer after ${MAX_ATTEMPTS} attempts`);
}

/** Walks the model chain, moving to the next model when one is rate-limited. */
async function groq(messages: ChatMessage[], maxTokens: number): Promise<{ content: string; model: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const errors: string[] = [];
  for (const model of groqModels()) {
    try {
      return { content: await groqModel(key, model, messages, maxTokens), model };
    } catch (e) {
      if (!(e instanceof RateLimitedError)) throw e;
      console.warn(`llm: ${model} rate-limited, trying the next model`);
      errors.push(e.message);
    }
  }
  throw new RateLimitedError(errors.join(" | ") || "Groq rate-limited: no models configured");
}

async function claude(messages: ChatMessage[], maxTokens: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      temperature: 0.2,
      system: system + "\n\nRespond with a single JSON object and nothing else.",
      messages: messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role, content: m.content })),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = json.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Claude returned no text");
  return text;
}

// Groq's free tier counts prompt + max_tokens against an 8k tokens-per-minute cap, so the
// output budget shrinks as the prompt grows (rough estimate: 3.5 chars per token).
const TPM_LIMIT = Number(process.env.GROQ_TPM_LIMIT) || 8000;

function outputBudget(messages: ChatMessage[]): number {
  const promptTokens = Math.ceil(messages.reduce((n, m) => n + m.content.length, 0) / 3.5) + 50;
  return Math.max(1500, Math.min(4000, TPM_LIMIT - 300 - promptTokens));
}

export interface JsonResult {
  data: unknown;
  /** Which model answered ("mock" under LLM_MOCK). For logging only. */
  model: string;
}

/** One chat completion that must return a JSON object, plus the model that answered. */
export async function completeJSONWithModel(req: JsonRequest): Promise<JsonResult> {
  if (isMock()) return { data: req.mock(), model: "mock" };
  const maxTokens = req.maxTokens ?? outputBudget(req.messages);
  let content: string;
  let model: string;
  try {
    ({ content, model } = await groq(req.messages, maxTokens));
  } catch (e) {
    if (!(e instanceof RateLimitedError) || !process.env.ANTHROPIC_API_KEY) throw e;
    content = await claude(req.messages, maxTokens);
    model = ANTHROPIC_MODEL;
  }
  return { data: parseJson(content), model };
}

/** One chat completion that must return a JSON object. Logs which model answered. */
export async function completeJSON(req: JsonRequest): Promise<unknown> {
  const { data, model } = await completeJSONWithModel(req);
  if (model !== "mock") console.info(`llm: answered by ${model}`);
  return data;
}

type RawExtraction = { summary: unknown[]; action_items: unknown[] };

function rawOf(e: { summary: unknown[]; action_items: unknown[] }): RawExtraction {
  return JSON.parse(JSON.stringify({ summary: e.summary, action_items: e.action_items }));
}

/**
 * Mock extraction for LLM_MOCK=1: the locked fixture's expected output when the segment ids
 * are a fixture meeting, else meeting1's output re-pointed at this meeting's first segment ids
 * (so uploads in e2e get items with valid evidence).
 */
export function mockExtraction(segmentIds: readonly string[]): RawExtraction {
  for (const e of [expected1, expected2]) {
    if (segmentIds.some((id) => id.startsWith(`${e.meeting_id}-s`))) return rawOf(e);
  }
  const raw = rawOf(expected1);
  if (segmentIds.length === 0) return raw;
  const remap = (id: string) => {
    const n = Number(id.split("-s").pop());
    return segmentIds[Math.min(Math.max(n - 1, 0), segmentIds.length - 1)];
  };
  const repoint = (items: unknown[]) =>
    items.map((i) => {
      const item = i as { evidence: string[] };
      return { ...item, evidence: [...new Set(item.evidence.map(remap))] };
    });
  return { summary: repoint(raw.summary), action_items: repoint(raw.action_items) };
}
