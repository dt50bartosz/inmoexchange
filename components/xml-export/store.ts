"use client";

import { createContext, createElement, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import type { XmlExportListItem } from "@/app/[locale]/panel/exportar-xml/server/actions";
import type { XmlExport } from "@/types/xmlExport";

/*
 * BROWSER STORE for the "Exportar XML" page (same pattern as components/properties/store.ts).
 * The page loads the links on the server and passes them to <StoreProvider>.
 * The server never writes to the shared `state`; during server rendering the hooks read the provider's data.
 */

let state: XmlExportListItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/* ---------- Provider ---------- */

const InitialData = createContext<XmlExportListItem[]>([]);

/** Wrap the page with this and pass the links it loaded on the server. */
export function StoreProvider({ items, children }: { items: XmlExportListItem[]; children: ReactNode }) {
  const [initial] = useState(() => {
    if (typeof window !== "undefined") state = items; // browser only, once per mount
    return items;
  });
  return createElement(InitialData.Provider, { value: initial }, children);
}

/* ---------- Hooks ---------- */

export const useXmlExports = () => {
  const initial = useContext(InitialData);
  return useSyncExternalStore(subscribe, () => state, () => initial);
};

/* ---------- Updates (with what the server actions return) ---------- */

/** Replaces a link with the server's version. Keeps the counts if the server didn't send new ones. */
export function upsertXmlExport(item: XmlExport | XmlExportListItem) {
  const old = state.find((e) => e.id === item.id);
  const next = { counts: old?.counts ?? { mine: 0, partners: 0 }, ...item };
  state = old ? state.map((e) => (e.id === item.id ? next : e)) : [next, ...state];
  emit();
}

export function removeXmlExport(id: string) {
  state = state.filter((e) => e.id !== id);
  emit();
}
