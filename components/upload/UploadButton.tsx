"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Icon } from "@/components/ui/Icon";
import { useUploads, type UploadRejection } from "./UploadsProvider";

/** Upload entry point: dialog with a drop zone; rejections show inline and keep the dialog open. */
export function UploadButton() {
  const { start } = useUploads();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [rejection, setRejection] = useState<UploadRejection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setRejection(null);
  };

  async function handle(file: File | undefined) {
    if (!file || busy) return;
    setBusy(true);
    setRejection(null);
    const r = await start(file);
    setBusy(false);
    if (r) {
      setRejection(r);
      setOpen(true);
    } else {
      close();
    }
  }

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    void handle(file);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDrag(false);
    void handle(e.dataTransfer.files?.[0]);
  }

  return (
    <>
      <Button variant="primary" size="lg" icon="upload" fullWidth onClick={() => setOpen(true)}>
        Upload
      </Button>
      <input ref={inputRef} type="file" data-testid="upload-input" accept="audio/*,video/*" hidden onChange={onChange} />
      <Dialog
        open={open}
        title="Upload a recording"
        description="We’ll transcribe it, find speakers, and write a summary you can check against the quotes."
        onClose={close}
        width={520}
        footer={<Button onClick={close}>Cancel</Button>}
      >
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "32px 20px",
            borderRadius: "var(--radius-md)",
            border: `1.5px dashed ${drag ? "var(--accent)" : "var(--paper-300)"}`,
            background: drag ? "var(--accent-soft)" : "var(--surface-app)",
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
          <span style={{ font: "600 15px/1.3 var(--font-sans)", color: "var(--text-1)" }}>Drop a video or audio file</span>
          <span style={{ font: "400 13px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            MP3, M4A, WAV, MP4, WebM · up to 60 minutes and 200 MB · 3 uploads per hour
          </span>
          <Button variant="primary" icon="upload" loading={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Checking file" : "Choose file"}
          </Button>
        </div>
        {rejection ? (
          <div role="alert" style={{ display: "flex", gap: 8, marginTop: 12, color: "var(--danger-text)" }}>
            <span style={{ paddingTop: 1 }}>
              <Icon name="circle-alert" size={16} />
            </span>
            <span style={{ font: "400 13px/1.45 var(--font-sans)" }}>
              <strong style={{ fontWeight: 600 }}>{rejection.title}</strong> {rejection.body}
            </span>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}

export default UploadButton;
