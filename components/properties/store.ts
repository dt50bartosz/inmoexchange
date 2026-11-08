"use client";

import { createContext, createElement, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Feed } from "@/lib/schemas/feed";
import type { Property } from "@/lib/schemas/property";

/*
 * BROWSER STORE for the "Mis propiedades" pages.
 * The page loads properties and feeds on the server and passes them to <StoreProvider>.
 * The store keeps them in the browser so the list, the dialogs and the feeds tab stay in sync,
 * and the components update it with what the server actions return.
 *
 * The server never writes to the shared `state` (it is shared by all requests on the server):
 * during server rendering the hooks read the data given to <StoreProvider> instead.
 */

type State = { properties: Property[]; feeds: Feed[] };

let state: State = { properties: [], feeds: [] };
const listeners = new Set<() => void>();

function setState(update: (s: State) => State) {
  state = update(state);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/* ---------- Provider ---------- */

const EMPTY: State = { properties: [], feeds: [] };
const InitialData = createContext<State>(EMPTY);

/** Wrap a page with this and pass the data it loaded on the server. */
export function StoreProvider({ properties = [], feeds = [], children }: Partial<State> & { children: ReactNode }) {
  const [initial] = useState<State>(() => {
    const data = { properties, feeds };
    // Fill the browser store once, when the page mounts (never on the server)
    if (typeof window !== "undefined") state = data;
    return data;
  });
  return createElement(InitialData.Provider, { value: initial }, children);
}

/* ---------- Hooks ---------- */

export const useProperties = () => {
  const initial = useContext(InitialData);
  return useSyncExternalStore(subscribe, () => state.properties, () => initial.properties);
};
export const useFeeds = () => {
  const initial = useContext(InitialData);
  return useSyncExternalStore(subscribe, () => state.feeds, () => initial.feeds);
};
export const useProperty = (id: string) => {
  const initial = useContext(InitialData);
  return useSyncExternalStore(
    subscribe,
    () => state.properties.find((p) => p.id === id),
    () => initial.properties.find((p) => p.id === id)
  );
};

/* ---------- Properties (saved in MongoDB; the store only mirrors the server) ---------- */

/** Replaces a property with the version the server returned (or adds it). */
export function upsertProperty(property: Property) {
  setState((s) => ({
    ...s,
    properties: s.properties.some((p) => p.id === property.id)
      ? s.properties.map((p) => (p.id === property.id ? property : p))
      : [property, ...s.properties],
  }));
}

/** Removes a property after the server deleted it. */
export function removeProperty(id: string) {
  setState((s) => ({ ...s, properties: s.properties.filter((p) => p.id !== id) }));
}

/* ---------- Feeds (saved in MongoDB; the store only mirrors the server) ---------- */

/** Adds a feed, or replaces it with the version the server returned. */
export function upsertFeed(feed: Feed) {
  setState((s) => ({
    ...s,
    feeds: s.feeds.some((f) => f.id === feed.id) ? s.feeds.map((f) => (f.id === feed.id ? feed : f)) : [...s.feeds, feed],
  }));
}

/** Removes a feed after the server deleted it. Its properties are removed or become manual. */
export function removeFeed(id: string, properties: "remove" | "keep") {
  setState((s) => ({
    feeds: s.feeds.filter((f) => f.id !== id),
    properties:
      properties === "remove"
        ? s.properties.filter((p) => !(p.source.kind === "feed" && p.source.feedId === id))
        : s.properties.map((p) =>
            p.source.kind === "feed" && p.source.feedId === id ? { ...p, source: { kind: "manual" }, hidden: false } : p
          ),
  }));
}
