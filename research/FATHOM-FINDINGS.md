# Fathom hands-on findings

Tested on 24 Oct 2026, free plan, Google Meet. One scripted ~2.5 min "weekly product sync"
with 5 tasks (Alex, Muhammad x2, Sara, John), 2 decisions, and 2 "maybe later" items
(pricing page, dark mode) that should NOT become action items.

## Screenshots (in this folder)
1. `01-bot-waiting-for-attendees.png` - bot stuck on "Waiting for attendees to join"
2. `02-summary-and-action-items.png` - summary (Next Steps) next to the Action Items panel
3. `03-ask-fathom-incomplete-answer.png` - Ask Fathom answer to "who was assigned tasks"
4. `04-action-items-unassigned.png` - action items with "Assign" and no owner

## What Fathom did well
- Caught the real tasks and put a timestamp on each one (@0:19, @0:54, @1:12, @1:34).
- Did NOT list "pricing page" or "dark mode" as action items. Handles "maybe later" well.
- Summary templates ("Enhanced" dropdown), copy summary, follow-up email.

## Where it fell short
1. **Getting the bot to record took three attempts.**
   - First call: forgot to admit the notetaker; it sat in the waiting room.
   - Second call: admitted, but it showed "Waiting for attendees to join" because I was
     alone, and said to "Click Skip in Fathom", a button that is not visible in the call.
     No recording appeared afterwards.
   - Third call: only worked after joining the same Meet from my phone as a second person.
2. **Summary and action items disagree.** "Next Steps" lists 5 tasks; the Action Items
   panel shows 4. "Tell marketing about the 22nd" is missing from the panel.
3. **Owners are missing or misleading.** 3 of 4 action items show "Assign" with no owner,
   even though names were said aloud. "Check SMS provider... report to Muhammad by Thu"
   reads like Muhammad's task; it is Alex's.
4. **Ask Fathom gave an incomplete, unsourced answer.** Asked for the people assigned
   tasks, it answered only "Alex, Sara" (missing John and Muhammad) with no citations.

## How my rebuild responds
| Fathom gap | My decision |
|---|---|
| Bot friction (admit, alone, hidden Skip) | No bot: upload or browser recording; capture stubbed by design |
| Summary vs action list mismatch | One extraction; every item backed by a transcript quote |
| Owners missing / misleading | Owner = person named, or shown as "not stated"; never guessed |
| Ask answer incomplete, no sources | Ask cites exact transcript lines; says "not found" instead of guessing |
| Long meetings hard to navigate | Chapters, speaker filter, talk time (56-min, 8-speaker seed) |

## Walkthrough line
"I tested Fathom on a real call. It's good at catching tasks, but it took three attempts
to get the bot to record, three of four tasks had no owner, the summary and the action
list disagreed, and Ask gave me two names out of four with no sources. So I cut the bot,
and every claim in my app shows the quote it came from, and owners are never guessed."
