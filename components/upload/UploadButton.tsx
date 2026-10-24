"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";

/** Upload entry point. P0-4: dialog + file input only; P0-7 wires the processing pipeline. */
export function UploadButton() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button variant="primary" size="lg" icon="upload" fullWidth onClick={() => setOpen(true)}>
        Upload
      </Button>
      <input
        ref={inputRef}
        type="file"
        data-testid="upload-input"
        accept="audio/*,video/*"
        hidden
        onChange={() => setOpen(false)}
      />
      <Dialog
        open={open}
        title="Upload a recording"
        description="We’ll transcribe it, find speakers, and write a summary you can check against the quotes."
        onClose={() => setOpen(false)}
        width={520}
        footer={<Button onClick={() => setOpen(false)}>Cancel</Button>}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "32px 20px",
            borderRadius: "var(--radius-md)",
            border: "1.5px dashed var(--paper-300)",
            background: "var(--surface-app)",
            textAlign: "center",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--accent-soft)",
              color: "var(--accent)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="cloud-upload" size={22} />
          </span>
          <span style={{ font: "600 15px/1.3 var(--font-sans)", color: "var(--text-1)" }}>Choose a video or audio file</span>
          <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Up to 60 minutes · 3 uploads per hour
          </span>
          <Button variant="primary" icon="upload" onClick={() => inputRef.current?.click()}>
            Choose file
          </Button>
        </div>
      </Dialog>
    </>
  );
}

export default UploadButton;
