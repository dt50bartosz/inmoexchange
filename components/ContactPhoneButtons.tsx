import { MessageCircle, Phone } from "lucide-react";
import { CONTACT_PHONE, contactWhatsappHref } from "@/lib/constants/contact";

type Props = {
  /** Pre-filled WhatsApp message, already translated. */
  whatsappMessage: string;
  labels: { call: string; whatsapp: string };
  /** Class strings for the two buttons (each page passes its own button style). */
  callClassName: string;
  whatsappClassName: string;
  className?: string;
};

/** "Call" and "WhatsApp" buttons with Colabora MLS's number (lib/constants/contact.ts). Server or client components. */
export default function ContactPhoneButtons({ whatsappMessage, labels, callClassName, whatsappClassName, className = "" }: Props) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row ${className}`}>
      <a href={contactWhatsappHref(whatsappMessage)} target="_blank" rel="noopener noreferrer" className={whatsappClassName}>
        <MessageCircle aria-hidden className="size-4" />
        {labels.whatsapp}
      </a>
      <a href={`tel:${CONTACT_PHONE.tel}`} className={callClassName}>
        <Phone aria-hidden className="size-4" />
        {labels.call} {CONTACT_PHONE.display}
      </a>
    </div>
  );
}
