"use client";

import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/Button";
import { whatsappHref } from "@/lib/utils";

type Props = {
  /** The WhatsApp number of the agency that should get the message (as saved; hidden if it isn't valid). */
  number: string | null | undefined;
  /** Pre-filled message, already in the visitor's language. */
  message: string;
  label: string;
  /** Records the click (a page's server action, bound). Never awaited: WhatsApp opens even if it fails. */
  onTrack: () => Promise<unknown>;
  /**
   * Phones: also show the button fixed at the bottom of the screen (detail pages with one property).
   * Desktop always shows it where it is placed (the contact / sidebar area).
   */
  stickyOnMobile?: boolean;
  className?: string;
};

/** "Book a viewing on WhatsApp": opens wa.me with a pre-filled message, in a new tab. */
export default function BookViewingButton({ number, message, label, onTrack, stickyOnMobile, className = "" }: Props) {
  const href = whatsappHref(number, message);
  if (!href) return null;

  const track = () => void onTrack().catch(() => undefined);
  const link = (extra: string) => (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={track} className={`${buttonVariants({ size: "lg" })} w-full ${extra}`}>
      <MessageCircle aria-hidden className="size-5" />
      {label}
    </a>
  );

  if (!stickyOnMobile) return link(className);
  return (
    <>
      {/* Desktop: in the sidebar */}
      {link(`hidden lg:inline-flex ${className}`)}
      {/* Phones: always in reach at the bottom of the screen (pages using it keep bottom padding for it) */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        {link("")}
      </div>
    </>
  );
}
