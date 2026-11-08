"use client";

import { createContext, useContext } from "react";
import type { ClientPage } from "@/types/client-pages";

type ClientPagesValue = { pages: ClientPage[] };

const ClientPagesContext = createContext<ClientPagesValue | null>(null);

/**
 * The agency's client pages, loaded on the server (see the CRM page), so the CRM buyer drawer
 * can show "View client page" / "Create client page". Read-only: changes go through server actions.
 */
export function ClientPagesProvider({ pages, children }: { pages: ClientPage[]; children: React.ReactNode }) {
  return <ClientPagesContext.Provider value={{ pages }}>{children}</ClientPagesContext.Provider>;
}

/** null outside the provider. */
export function useClientPagesOptional() {
  return useContext(ClientPagesContext);
}
