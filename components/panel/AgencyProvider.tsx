"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CurrentAgency } from "@/types/models";

const AgencyContext = createContext<CurrentAgency | null>(null);

export default function AgencyProvider({
  agency,
  children,
}: {
  agency: CurrentAgency;
  children: ReactNode;
}) {
  return <AgencyContext.Provider value={agency}>{children}</AgencyContext.Provider>;
}

// For display only (name, logo, email). Never use it to decide access.
export function useAgency(): CurrentAgency {
  const ctx = useContext(AgencyContext);
  if (!ctx) throw new Error("useAgency must be used inside the panel layout");
  return ctx;
}
