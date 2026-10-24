// LLM access (PLAN.md Architecture: external APIs behind lib/llm.ts).
// Groq chat completions (OpenAI-compatible REST) in JSON mode. LLM_MOCK=1 skips the network
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
// llama-3.3-70b-versatile is no longer listed on this Groq account; gpt-oss-120b is the
// strongest listed model with JSON mode. Overridable for experiments.
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-5-5";
const TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 5;
const MAX_WAIT_S = 65;

export function isMock(): boolean {
  return process.env.LLM_MOCK === "1" || process.env.LLM_MOCK === "true";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retryAfterSeconds(res: Response, attempt: number): number {
  const h = res.headers.get("retry-after");
  const n = h ? Number(h) : NaN;
  const base = Number.isFinite(n) && n >= 0 ? n : 2 ** attempt;
  return Math.min(MAX_WAIT_S, base + 0.5);
}

function parseJson(content: string): unknown {
  const text = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "");
  try {
    return JSON.parse(text);
  } catch {
    throw new LlmJsonError("model returned invalid JSON", content);
  }
}

async function groq(messages: ChatMessage[], maxTokens: number): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  const body: Record<string, unknown> = {
    model: GROQ_MODEL,
    messages,
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" },
  };
  if (GROQ_MODEL.startsWith("openai/gpt-oss")) {
    body.reasoning_effort = "medium";
    body.include_reasoning = false;
  }

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw new Error(`Groq request failed: ${(e as Error).message}`);
      await sleep(1000 * attempt);
      continue;
    }
    if (res.ok) {
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error("Groq returned no content");
      return content;
    }
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429 || res.status >= 500) {
      if (attempt === MAX_ATTEMPTS) {
        if (res.status === 429) throw new RateLimitedError(`Groq rate-limited: ${detail}`);
        throw new Error(`Groq ${res.status}: ${detail}`);
      }
      await sleep(retryAfterSeconds(res, attempt) * 1000);
      continue;
    }
    // A JSON-mode failure ("json_validate_failed") is a model output problem: let the caller retry.
    if (res.status === 400 && detail.includes("json_validate_failed")) {
      throw new LlmJsonError("model returned invalid JSON", detail);
    }
    throw new Error(`Groq ${res.status}: ${detail}`);
  }
  throw new Error("unreachable");
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

/** One chat completion that must return a JSON object. */
export async function completeJSON(req: JsonRequest): Promise<unknown> {
  if (isMock()) return req.mock();
  const maxTokens = req.maxTokens ?? outputBudget(req.messages);
  let content: string;
  try {
    content = await groq(req.messages, maxTokens);
  } catch (e) {
    if (!(e instanceof RateLimitedError) || !process.env.ANTHROPIC_API_KEY) throw e;
    content = await claude(req.messages, maxTokens);
  }
  return parseJson(content);
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
