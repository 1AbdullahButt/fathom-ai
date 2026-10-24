"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from "react";
import { Spinner } from "@/components/ui/Spinner";
import styles from "./NavProgress.module.css";

/**
 * Client-side pending feedback for in-app navigations to meetings and clips. The /m and /c
 * routes have no loading.tsx (so unknown ids return a real HTTP 404, DECISIONS.md), which means
 * Next keeps the old page until the server render finishes. This shows a thin tide bar plus a
 * polite "Loading meeting…" announcement from the click until the new route commits.
 */

interface NavProgressApi {
  /** A link (or programmatic push) to `href` started (`true`) or stopped (`false`) pending. */
  report(key: string, href: string | null): void;
  /** Programmatic navigation inside a transition, for buttons that cannot be links. */
  push(href: string): void;
}

const NavProgressContext = createContext<NavProgressApi | null>(null);

function labelFor(href: string): string {
  const path = href.split(/[?#]/)[0];
  if (path.startsWith("/c/")) return "Loading clip…";
  if (path.startsWith("/m/")) return "Loading meeting…";
  return "Loading meetings…";
}

/** Clears every pending entry when the committed URL changes (also covers back/forward). */
function RouteCommitWatcher({ onCommit }: { onCommit(): void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onCommit();
  }, [pathname, search, onCommit]);
  return null;
}

export function NavProgressProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<Map<string, string>>(() => new Map());
  const [pushHref, setPushHref] = useState<string | null>(null);
  const [isPushing, startTransition] = useTransition();

  const report = useCallback((key: string, href: string | null) => {
    setPending((prev) => {
      if (href === null ? !prev.has(key) : prev.get(key) === href) return prev;
      const next = new Map(prev);
      if (href === null) next.delete(key);
      else next.set(key, href);
      return next;
    });
  }, []);

  const push = useCallback(
    (href: string) => {
      setPushHref(href);
      startTransition(() => router.push(href));
    },
    [router],
  );

  const onCommit = useCallback(() => {
    setPending((prev) => (prev.size ? new Map() : prev));
    setPushHref(null);
  }, []);

  const api = useMemo(() => ({ report, push }), [report, push]);
  const active = isPushing && pushHref ? pushHref : (pending.values().next().value ?? null);

  // popstate (back/forward) aborts or replaces any pending navigation; the watcher ends the
  // bar once the URL commits, this ends it even when the URL lands where it already was.
  useEffect(() => {
    const onPop = () => onCommit();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onCommit]);

  return (
    <NavProgressContext.Provider value={api}>
      {children}
      <Suspense fallback={null}>
        <RouteCommitWatcher onCommit={onCommit} />
      </Suspense>
      <div className={styles.bar} data-active={active ? "true" : undefined} aria-hidden="true">
        <span className={styles.fill} />
      </div>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {active ? labelFor(active) : ""}
      </span>
    </NavProgressContext.Provider>
  );
}

/** Programmatic navigation with the pending bar; falls back to a plain push outside the provider. */
export function useNavPush(): { push(href: string): void } {
  const ctx = useContext(NavProgressContext);
  const router = useRouter();
  return useMemo(() => ({ push: ctx ? ctx.push : (href: string) => router.push(href) }), [ctx, router]);
}

/**
 * Must render inside a next/link <Link>. Reports the link's pending state to the provider, sets
 * aria-busy on the anchor, and optionally shows a small spinner (absolutely positioned, so no
 * layout shift). Modified clicks and new tabs never make a Link pending, so the bar stays off.
 */
export function LinkPendingMarker({ href, spinner = false, className }: { href: string; spinner?: boolean; className?: string }) {
  const { pending } = useLinkStatus();
  const ctx = useContext(NavProgressContext);
  const key = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const report = ctx?.report;

  useEffect(() => {
    const anchor = ref.current?.closest("a");
    if (pending) anchor?.setAttribute("aria-busy", "true");
    else anchor?.removeAttribute("aria-busy");
    report?.(key, pending ? href : null);
  }, [pending, href, key, report]);

  useEffect(() => () => report?.(key, null), [key, report]);

  return (
    <span ref={ref} className={className ?? styles.marker} data-pending={pending ? "true" : undefined} aria-hidden="true">
      {spinner && pending ? <Spinner size={16} /> : null}
    </span>
  );
}

type NavLinkProps = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** A real <a href> Link that drives the top pending bar while its navigation is in flight. */
export function NavLink({ href, children, ...rest }: NavLinkProps) {
  return (
    <Link href={href} {...rest}>
      {children}
      <LinkPendingMarker href={href} />
    </Link>
  );
}
