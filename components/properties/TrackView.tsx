"use client";

import { useEffect, useRef, type RefObject } from "react";

/*
 * Property view tracking, done in the browser after the page shows, so tracking never slows a page down.
 * Prefetches and visitors without JavaScript (mostly bots) are never counted. The server decides what counts
 * (lib/server/property-events.ts); errors are ignored on purpose: stats must never break a page.
 */

/** Calls `track` once, right after the page has shown. Renders nothing. `track` is a page's server action, already bound. */
export default function TrackView({ track }: { track: () => Promise<unknown> }) {
  const done = useRef(false); // React dev mode runs effects twice
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    track().catch(() => undefined);
  }, [track]);
  return null;
}

/** Calls `track` once, the first time at least half of the element is on screen (cards on client pages). */
export function useTrackWhenSeen(ref: RefObject<HTMLElement | null>, track: () => Promise<unknown>) {
  const done = useRef(false);
  const latest = useRef(track);
  latest.current = track;

  useEffect(() => {
    const el = ref.current;
    if (!el || done.current) return;
    const send = () => {
      if (done.current) return;
      done.current = true;
      latest.current().catch(() => undefined);
    };
    if (typeof IntersectionObserver === "undefined") return send(); // very old browsers: count on show
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          send();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
}
