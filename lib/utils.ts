import { RE, normalizeWhatsapp } from "@/lib/schemas/shared"

export { cn } from "cn"

/**
 * wa.me link for a WhatsApp number as the agency saved it (older numbers may lack +34), with an optional
 * pre-filled message. null when it can't be a WhatsApp number: callers then hide the button.
 */
export const whatsappHref = (raw: string | null | undefined, text?: string): string | null => {
  const n = normalizeWhatsapp(raw ?? "")
  if (!RE.whatsapp.test(n)) return null
  return `https://wa.me/${n.slice(1)}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}

export const isWellFormedXml = (xml: string) => {
  if (typeof window === "undefined") return true
  const doc = new DOMParser().parseFromString(xml, "application/xml")
  return !doc.querySelector("parsererror")
}

// Locale-aware: "512 KB" / "1,5 MB"
export const formatSize = (bytes: number, locale: string) => {
  const mb = bytes >= 1024 * 1024
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: mb ? "megabyte" : "kilobyte",
    unitDisplay: "short",
    maximumFractionDigits: mb ? 1 : 0,
  }).format(mb ? bytes / 1024 / 1024 : bytes / 1024)
}