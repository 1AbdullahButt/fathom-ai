"use client";

import Form from "next/form";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import styles from "./SearchBox.module.css";

export interface SearchBoxProps {
  defaultValue?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
}

/** Search input that submits to /search?q=. Pressing "/" anywhere on the page focuses it. Render one per page. */
export function SearchBox({ defaultValue = "", size = "md", autoFocus = false }: SearchBoxProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <Form action="/search" role="search" className={`${styles.box} ${size === "lg" ? styles.lg : ""}`}>
      <Icon name="search" size={17} color="var(--text-muted)" />
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
        }}
        placeholder="Search titles and transcripts"
        aria-label="Search titles and transcripts"
        autoFocus={autoFocus}
        autoComplete="off"
        className={styles.input}
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          className={styles.clear}
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" size={13} strokeWidth={2} />
        </button>
      ) : (
        <kbd className={styles.kbd} aria-hidden="true">
          /
        </kbd>
      )}
    </Form>
  );
}
