// Shared tokeniser for Ask retrieval (lib/ask.ts) and the Ask post-filter (lib/askFilter.ts).

// Function words and question scaffolding: they never decide relevance.
const STOPWORDS = new Set(
  (
    "a an the and or but if then so of to in on at by for from with about into over under as is are was were be been being " +
    "am do does did done doing have has had having will would shall should can could may might must " +
    "i me my we us our you your he him his she her it its they them their this that these those there here " +
    "what which who whom whose when where why how whats any anything some something all every each no not " +
    "yes ok okay just also very really much many more most less least than too only own same other " +
    "say said says tell told talk talked discuss discussed mention mentioned meeting meetings call calls " +
    "anyone someone everyone get got let lets know think thing things one ones out up down off again"
  ).split(" "),
);

/** Light suffix stemmer: enough to match budget/budgets, commit/committed, check/checking. */
export function stem(word: string): string {
  let w = word;
  if (w.length > 4 && w.endsWith("ies")) w = `${w.slice(0, -3)}y`;
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && w.endsWith("es") && /(ss|sh|ch|x|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  else if (w.length > 4 && w.endsWith("ly")) w = w.slice(0, -2);
  // committ -> commit, plann -> plan
  if (w.length > 4 && /([b-df-hj-np-tv-z])\1$/.test(w) && !/(ll|ss|zz)$/.test(w)) w = w.slice(0, -1);
  return w;
}

/** Content terms of a text: lowercased, split on non-alphanumerics, stopwords removed, stemmed. */
export function terms(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().replace(/['’]s\b/g, "").split(/[^\p{L}\p{N}]+/u)) {
    if (raw.length < 2 || STOPWORDS.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}
