// Summary templates (PLAN.md P1-1). Each template changes what the summary focuses on;
// action-item rules are shared. General is complete; sales and one_on_one are first drafts
// that P1-1 finishes.
import type { Template } from "./types";

export const TEMPLATE_LABELS: Record<Template, string> = {
  general: "General",
  sales: "Sales call",
  one_on_one: "1:1 & Standup",
};

const FOCUS: Record<Template, string> = {
  general: [
    "Summarise the meeting for someone who missed it.",
    "Cover, in order of importance: decisions made (and why), key facts or numbers stated,",
    "open problems or disagreements, and what happens next.",
    "Each point is one plain sentence stating a concrete fact from the meeting, not a topic label.",
  ].join(" "),
  sales: [
    "Summarise this as a sales/customer call.",
    "Cover: the customer's situation and pains, what they asked for, objections or concerns,",
    "pricing/budget/timeline if stated, and agreed next steps.",
  ].join(" "),
  one_on_one: [
    "Summarise this as a 1:1 or standup.",
    "Cover: progress since last time, current work, blockers, feedback given, and agreed follow-ups,",
    "attributing each to the person it concerns.",
  ].join(" "),
};

export function templateFocus(template: Template): string {
  return FOCUS[template];
}
