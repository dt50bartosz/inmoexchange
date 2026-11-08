// app/p/layout.tsx
// Root layout for public client pages (/p/<token>): no site navbar or footer, no locale prefix.
// The page shows only the agency that shared it.
import "../globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  // Private links: keep them out of search engines and don't leak the token to other sites
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function ClientPageLayout({ children }: { children: React.ReactNode }) {
  // Only the property labels the page uses (types, features, title), not the panel's texts
  const all = await getMessages({ locale: "en" }); // client pages are in English for now
  const { titleFormat, noTown, types, features, conditions } = (all.panel as Record<string, Record<string, unknown>>).properties;
  const messages = { panel: { properties: { titleFormat, noTown, types, features, conditions } } };
  return (
    <html lang="en" className={inter.variable} translate="no" suppressHydrationWarning>
      <body className="min-h-screen bg-muted/30 font-sans">
        <NextIntlClientProvider locale="en" messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
