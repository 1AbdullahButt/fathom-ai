// Pure matching rules for the Layer 2 evals (SPEC §7): fuzzy on task wording,
// exact on owner and resolved due date, evidence must overlap the expected segments.

const STOP = new Set([
  "a", "an", "the", "to", "for", "of", "on", "in", "at", "by", "is", "are", "be", "and", "or",
  "with", "about", "whether", "if", "that", "this", "it", "its", "you", "your", "we", "our",
  "i", "will", "should", "can", "please", "any", "from", "into", "up",
]);

function stem(w: string): string {
  if (w.length > 5 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 4 && w.endsWith("ed")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function contentTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w && !STOP.has(w))
      .map(stem),
  );
}

/** Share of the expected task's content tokens that appear in the actual task (0..1). */
export function taskOverlap(expected: string, actual: string): number {
  const e = contentTokens(expected);
  const a = contentTokens(actual);
  if (e.size === 0) return 0;
  let hit = 0;
  for (const t of e) if (a.has(t)) hit++;
  return hit / e.size;
}

export const TASK_THRESHOLD = 0.5;

export interface ItemLike {
  task: string;
  owner: string | null;
  due: string | null;
  evidence: string[];
}

function sameOwner(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Best actual item for an expected one: task overlap >= threshold, owner and due exact, evidence overlaps. */
export function findMatch<T extends ItemLike>(expected: ItemLike, actual: T[]): T | undefined {
  let best: T | undefined;
  let bestScore = -1;
  for (const a of actual) {
    const score = taskOverlap(expected.task, a.task);
    if (score < TASK_THRESHOLD) continue;
    if (!sameOwner(expected.owner, a.owner)) continue;
    if (expected.due !== a.due) continue;
    if (!a.evidence.some((id) => expected.evidence.includes(id))) continue;
    if (score > bestScore) {
      best = a;
      bestScore = score;
    }
  }
  return best;
}

/** Items whose task mentions any forbidden phrase (e.g. "dark mode"). */
export function forbiddenItems<T extends { task: string }>(items: T[], phrases: string[]): T[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return items.filter((i) => phrases.some((p) => norm(i.task).includes(norm(p))));
}
