import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StateBlock } from "@/components/ui/StateBlock";

// Placeholder until P0-4 builds the meetings list.
export default function Home() {
  return (
    <main style={{ maxWidth: 920, margin: "0 auto", padding: "var(--space-10) var(--space-9)" }}>
      <header style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, font: "var(--type-display)", color: "var(--text-1)", flex: 1 }}>Meetings</h1>
        <Button variant="primary" icon="upload" disabled>
          Upload
        </Button>
        <Button variant="primary" icon="mic" disabled>
          Record
        </Button>
      </header>
      <p style={{ margin: "var(--space-4) 0 var(--space-9)", color: "var(--text-muted)" }}>
        Meeting notes without a bot. Timestamps read like <span style={{ font: "var(--type-time)" }}>1:02:18</span>.{" "}
        <Badge tone="accent" size="sm">
          Preview
        </Badge>
      </p>
      <StateBlock
        kind="empty"
        title="Meetings list coming soon"
        body="No bot joins the call. Upload a recording you already have and we'll transcribe it."
      />
    </main>
  );
}
