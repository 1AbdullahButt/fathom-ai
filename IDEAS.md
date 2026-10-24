# Ideas (out of scope for now)

- Upload processing for long files: submit to AssemblyAI with a `webhook_url` and store the
  transcript id on the meeting (needs a `transcript_id` column), so transcription is not bound to
  one function's 300 s window. Today a 60-minute file may exceed it (DECISIONS.md, P0-7).
- Mark uploads stuck in "processing" for > 30 min as failed (e.g. the tab closed mid-upload).
- Restore AI text for an edited summary point / action item (design HumanEdit; AI text is kept in `summaries` + `summary_edits.ai_text`).
- A reason on the low-confidence flag (needs a `confidence_reason` field in extraction and the action_items table).
