// app/p/[token]/page.tsx
// The public client page. No login: the random token in the link is the key.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicPage } from "@/lib/server/client-pages";
import ClientShortlist from "@/components/client-pages/public/ClientShortlist";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Your property shortlist" };
}

export default async function PublicClientPage({ params }: Props) {
  const { token } = await params;
  const page = await getPublicPage(token);
  // Unknown, paused, expired, or the agency is suspended: same 404, nothing revealed
  if (!page) notFound();
  return <ClientShortlist token={token} page={page} />;
}
