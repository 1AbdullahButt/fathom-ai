import type { ReactNode } from "react";

const MARK_STYLE = { background: "var(--amber-100)", color: "inherit", borderRadius: 2, padding: "0 1px" } as const;

/**
 * Wraps every case-insensitive occurrence of `query` in `text` with <mark>.
 * Built from React text nodes only (no HTML strings), so transcript text is always escaped.
 */
export function markMatch(text: string, query: string): ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  let i = lower.indexOf(q);
  while (i !== -1) {
    if (i > from) out.push(text.slice(from, i));
    out.push(
      <mark key={i} style={MARK_STYLE}>
        {text.slice(i, i + q.length)}
      </mark>,
    );
    from = i + q.length;
    i = lower.indexOf(q, from);
  }
  if (out.length === 0) return text;
  if (from < text.length) out.push(text.slice(from));
  return out;
}
