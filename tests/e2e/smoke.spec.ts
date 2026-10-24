// SPEC §7 Layer 1 e2e_smoke: upload -> summary -> click item -> transcript scrolls.
// Runs against `npm run start` with DATA_SOURCE=memory TRANSCRIBE_MOCK=1 LLM_MOCK=1 (playwright.config.ts),
// so no external API is called.
import { test, expect } from "@playwright/test";
import { Buffer } from "node:buffer";

const UPLOAD_NAME = "smoke-test-upload";

/** A valid silent mono 8-bit 8 kHz WAV, long enough to cover the mocked transcript (~100 s). */
function silentWav(seconds: number): Buffer {
  const rate = 8000;
  const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 0x80);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + n, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); // byte rate
  b.writeUInt16LE(1, 32); // block align
  b.writeUInt16LE(8, 34); // bits per sample
  b.write("data", 36, "ascii");
  b.writeUInt32LE(n, 40);
  return b;
}

const TIMESTAMP = /\b(\d{1,2}:\d{2}(?::\d{2})?)\b/;

test("upload -> summary -> click action item evidence -> transcript line is active and in view", async ({
  page,
}) => {
  await page.goto("/");

  // A1: seeded meetings are listed, no login.
  await expect(page.locator('a[href^="/m/"]').first()).toBeVisible();

  // A7: upload a new file.
  await page.locator('[data-testid="upload-input"]').setInputFiles({
    name: `${UPLOAD_NAME}.wav`,
    mimeType: "audio/wav",
    buffer: silentWav(110),
  });

  // The new meeting appears in the list (titled from the file name) and finishes processing.
  // The list updates itself (A7 progress states); no reload, which could interrupt processing.
  await expect(page.getByText(UPLOAD_NAME).first()).toBeVisible({ timeout: 30_000 });
  const row = page.locator('a[href^="/m/"]', { hasText: UPLOAD_NAME }).first();
  await expect(async () => {
    await expect(row).toBeVisible();
    await expect(row).not.toContainText(
      /processing|uploading|transcribing|summari[sz]ing|queued|error|failed/i,
    );
  }).toPass({ timeout: 60_000 });

  await row.click();
  await expect(page).toHaveURL(/\/m\/[^/?#]+/);

  // Summary tab shows at least one point with an evidence quote.
  await page.getByRole("tab", { name: /^Summary$/ }).click();
  const summaryPanel = page.getByRole("tabpanel");
  await expect(summaryPanel.getByRole("button", { name: TIMESTAMP }).first()).toBeVisible({
    timeout: 15_000,
  });

  // Action items tab: click the first item's quote.
  await page.getByRole("tab", { name: /^Action items$/ }).click();
  const quote = page.getByRole("tabpanel").getByRole("button", { name: TIMESTAMP }).first();
  await expect(quote).toBeVisible();
  const quoteName = await quote.evaluate(
    (el) => `${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`,
  );
  const ts = quoteName.match(TIMESTAMP)?.[1];
  expect(ts, `quote button name should contain a timestamp, got "${quoteName}"`).toBeTruthy();
  await quote.click();

  // Exactly one transcript line is active, it is the quoted moment, and it was scrolled into view.
  const active = page.locator('[data-segment-id][aria-current="true"]');
  await expect(active).toHaveCount(1);
  await expect(active).toContainText(ts!);
  await expect(active).toBeInViewport();
});
