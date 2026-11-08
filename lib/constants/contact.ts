/**
 * Colabora MLS's own phone / WhatsApp, shown on the public pages (footers, /contacto, /promotoras, home page WhatsApp).
 * Change it here only.
 */
export const CONTACT_PHONE = {
  /** As people read it */
  display: "+34 744 075 004",
  /** For tel: links */
  tel: "+34744075004",
  /** For wa.me links: country code + number, digits only */
  whatsapp: "34744075004",
} as const;

/** wa.me link with an optional pre-filled message. */
export const contactWhatsappHref = (text?: string) =>
  `https://wa.me/${CONTACT_PHONE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
