import { getTranslations } from "next-intl/server";
import { MessageCircle } from "lucide-react";
import { contactWhatsappHref } from "@/lib/constants/contact";
import { ctaOutlineOnDark } from "./styles";

/** wa.me link to Colabora MLS (number in lib/constants/contact.ts) with a ready message. */
export default async function WhatsAppButton({ className = "" }: { className?: string }) {
  const t = await getTranslations("landing.finalCta");
  return (
    <a href={contactWhatsappHref(t("whatsappMessage"))} target="_blank" rel="noopener noreferrer" className={`${ctaOutlineOnDark} ${className}`}>
      <MessageCircle aria-hidden className="size-4" />
      {t("whatsapp")}
    </a>
  );
}
