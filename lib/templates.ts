// Summary templates (PLAN.md P1-1, SPEC §2 item 4). Each template changes what the summary
// focuses on; the evidence/null rules and action-item rules in lib/extract.ts are shared.
// Action items always come from the general extraction (DECISIONS.md: template switch).
import type { Template } from "./types";

/** Display order of the template switcher. */
export const TEMPLATES: readonly Template[] = ["general", "sales", "one_on_one"];

export const TEMPLATE_LABELS: Record<Template, string> = {
  general: "General",
  sales: "Sales call",
  one_on_one: "1:1 / Standup",
};

export function isTemplate(v: unknown): v is Template {
  return typeof v === "string" && (TEMPLATES as readonly string[]).includes(v);
}

const SENTENCE = "Each point is one plain sentence stating a concrete fact from the meeting, not a topic label.";

const FOCUS: Record<Template, string> = {
  general: [
    "Summarise the meeting for someone who missed it.",
    "Cover, in order of importance: decisions made (and why), key facts or numbers stated,",
    "open problems or disagreements, and what happens next.",
    SENTENCE,
  ].join(" "),
  sales: [
    "Summarise this as a sales or customer call, for the seller's team.",
    "Cover, in this order: the customer's pain points (what is going wrong for them today and why it matters);",
    "their requirements (what they need a solution to do, must-haves vs nice-to-haves);",
    "objections or concerns they raised (price, risk, competitors, timing, fit);",
    "the decision process (who decides, who else must approve, budget, timeline, criteria) as far as it was said;",
    "and the agreed next steps.",
    "Start each point with its category followed by a colon",
    '(e.g. "Pain point: invoices reach customers two days late, which delays payment.").',
    "Use only these categories: Pain point, Requirement, Objection, Decision process, Next step.",
    "If the meeting is not a sales call, apply them to whoever plays the customer or requester role",
    "and leave out categories nothing was said about.",
    SENTENCE,
  ].join(" "),
  one_on_one: [
    "Summarise this as a 1:1 or standup, person by person.",
    "For each participant cover: their updates (what they finished or are working on),",
    "their blockers, decisions made with them, and follow-ups they took on.",
    "Start each point with the person's owner name followed by a colon",
    '(e.g. "Maria: finished the export API and is blocked on staging access.");',
    'use "Team:" for something that concerns everyone, and the speaker label for a speaker with no known name.',
    "Attribute a point to a person only if they said it or it was said about them; never move work between people.",
    "Group each person's points together, in the order people first speak.",
    SENTENCE,
  ].join(" "),
};

export function templateFocus(template: Template): string {
  return FOCUS[template];
}

/** On-demand template summaries one client may generate per hour (cost guard). */
export const GENERATIONS_PER_HOUR = 10;
