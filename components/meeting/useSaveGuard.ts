"use client";

import { useEffect } from "react";

/** While `saving`, ask before a reload or navigation away (an in-flight edit would be lost). */
export function useSaveGuard(saving: boolean): void {
  useEffect(() => {
    if (!saving) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Older browsers need returnValue set to show the prompt.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);
}
