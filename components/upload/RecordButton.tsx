"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

/** Record is stubbed (SPEC): explains that no bot joins and points to upload. */
export function RecordButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" size="lg" icon="mic" fullWidth onClick={() => setOpen(true)}>
        Record
      </Button>
      <Dialog
        open={open}
        title="Record on this device"
        description="No bot joins the call. Recording would happen here, on your own device."
        onClose={() => setOpen(false)}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Got it
          </Button>
        }
      >
        <p style={{ margin: 0, font: "400 14px/1.5 var(--font-sans)", color: "var(--text-2)" }}>
          Capture isn’t available in this demo. Upload a recording you already have instead and we’ll
          transcribe it.
        </p>
      </Dialog>
    </>
  );
}

export default RecordButton;
