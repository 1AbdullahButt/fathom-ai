import type { CSSProperties } from "react";

/**
 * Letters only. A one- or two-letter parenthetical is a speaker label ("Team member, name not
 * stated (B)" -> "B"); other parentheticals and anything after a comma are descriptions
 * ("Eileen (marketing)" -> "E").
 */
export function initials(name = ""): string {
  const label = /\(\s*([A-Za-z]{1,2})\s*\)/.exec(name);
  if (label) return label[1].toUpperCase();
  const base = name.replace(/\([^)]*\)?/g, " ").split(",")[0];
  const words = base
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  const first = words[0]?.[0] ?? "";
  const last = words.length > 1 ? (words[words.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  speaking?: boolean;
  ring?: string;
  style?: CSSProperties;
}

/** Initials avatar tinted with the speaker colour; `speaking` adds a ring. */
export function Avatar({ name, color = "var(--ink-500)", size = 28, speaking = false, ring, style }: AvatarProps) {
  return (
    <span
      title={name}
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        background: `color-mix(in oklab, ${color} 15%, var(--paper-0))`,
        color,
        font: `600 ${Math.round(size * 0.38)}px/1 var(--font-sans)`,
        letterSpacing: ".02em",
        boxShadow: speaking
          ? `0 0 0 2px var(--paper-0), 0 0 0 4px ${color}`
          : ring
            ? `0 0 0 2px ${ring}`
            : "none",
        transition: "box-shadow var(--dur-2) var(--ease-out)",
        ...style,
      }}
    >
      {initials(name)}
    </span>
  );
}

export default Avatar;
