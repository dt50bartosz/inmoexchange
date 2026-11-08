// lib/server/kyero.ts
// Downloads and reads Kyero XML feeds (v3). Used to test a feed URL and to import it.
import "server-only";
import { isLatitude, isLongitude } from "@/lib/geo";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { XMLParser } from "fast-xml-parser";

const TIMEOUT_MS = 20_000;
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_REDIRECTS = 3;

/* ---------- Reading the XML ---------- */

/** One property from a Kyero feed, cleaned up (trimmed text, real numbers). */
export type KyeroProperty = {
  id: string; // Kyero's own id: used to find the same property on the next sync
  ref: string;
  price: number | null;
  priceFreq: string; // "sale", "month", "week"…
  newBuild: boolean;
  type: string; // lowercase, e.g. "penthouse", "town house"
  town: string;
  province: string;
  /** The property's own point from <location> (most feeds have it); null when missing or not a valid point. */
  latitude: number | null;
  longitude: number | null;
  beds: number | null;
  baths: number | null;
  built: number | null;
  plot: number | null;
  desc: Record<string, string>; // { en: "...", es: "..." }
  features: string[];
  images: string[]; // urls, in the feed's order
};

const parser = new XMLParser({
  ignoreAttributes: false, // keep <image id="1">
  parseTagValue: false, // keep everything as text; numbers are converted below
  trimValues: true,
  isArray: (name) => name === "property" || name === "feature" || name === "image",
});

/** Text of a node (CDATA is already merged into the text), trimmed. */
function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return text((v as Record<string, unknown>)["#text"]);
  return String(v).trim();
}

function num(v: unknown): number | null {
  const s = text(v).replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Reads a Kyero XML. Returns null if it isn't a Kyero feed. */
export function parseKyero(xml: string): KyeroProperty[] | null {
  let data: Record<string, unknown>;
  try {
    data = parser.parse(xml);
  } catch {
    return null;
  }

  const root = data?.root as Record<string, unknown> | undefined;
  if (!root || typeof root !== "object") return null;

  const items = (root.property as Record<string, unknown>[] | undefined) ?? [];

  return items.map((p) => {
    const surface = (p.surface_area ?? {}) as Record<string, unknown>;
    const location = (p.location ?? {}) as Record<string, unknown>;
    const lat = num(location.latitude);
    const lng = num(location.longitude);
    // 0,0 (a common "not set") and out-of-range values are no location
    const point = isLatitude(lat) && isLongitude(lng) && !(lat === 0 && lng === 0) ? { lat, lng } : null;
    const desc = (p.desc ?? {}) as Record<string, unknown>;
    const features = ((p.features as Record<string, unknown> | undefined)?.feature as unknown[] | undefined) ?? [];
    const images = ((p.images as Record<string, unknown> | undefined)?.image as Record<string, unknown>[] | undefined) ?? [];

    return {
      id: text(p.id),
      ref: text(p.ref),
      price: num(p.price),
      priceFreq: text(p.price_freq).toLowerCase(),
      // Kyero says 0/1; some CRMs write true / yes / sí. Missing or anything else = resale.
      newBuild: /^(1|true|yes|y|si|sí)$/i.test(text(p.new_build)),
      type: text(p.type).toLowerCase(),
      town: text(p.town),
      province: text(p.province),
      latitude: point?.lat ?? null,
      longitude: point?.lng ?? null,
      beds: num(p.beds),
      baths: num(p.baths),
      built: num(surface.built),
      plot: num(surface.plot),
      desc: Object.fromEntries(
        Object.entries(desc)
          .map(([lang, value]) => [lang.toLowerCase(), text(value)])
          .filter(([, value]) => value)
      ),
      features: features.map(text).filter(Boolean),
      images: images
        .map((img) => ({ order: Number(img["@_id"]) || 0, url: text(img.url) }))
        .filter((img) => /^https?:\/\//i.test(img.url))
        .sort((a, b) => a.order - b.order)
        .map((img) => img.url),
    };
  });
}

/* ---------- Testing a feed URL ---------- */

export type FeedCheck =
  | { ok: true; count: number; properties: KyeroProperty[] }
  | { ok: false; reason: "unreachable" | "not_kyero" | "blocked" | "too_large" };

/** Downloads and reads the feed. `count` is the number of properties for sale. */
export async function checkKyeroFeed(url: string): Promise<FeedCheck> {
  const download = await downloadFeed(url);
  if (!download.ok) return download;

  const properties = parseKyero(download.text);
  if (!properties) return { ok: false, reason: "not_kyero" };

  const count = properties.filter((p) => p.priceFreq === "sale").length;
  return { ok: true, count, properties };
}

/* ---------- Downloading safely ---------- */

/** Fetches a public http(s) URL as text. Refuses internal addresses, also after redirects. */
export async function downloadFeed(
  url: string
): Promise<{ ok: true; text: string } | { ok: false; reason: "unreachable" | "blocked" | "too_large" }> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let target: URL;
    try {
      target = new URL(current);
    } catch {
      return { ok: false, reason: "unreachable" };
    }
    if (target.protocol !== "http:" && target.protocol !== "https:") return { ok: false, reason: "blocked" };
    if (!(await isPublicHost(target.hostname))) return { ok: false, reason: "blocked" };

    let res: Response;
    try {
      res = await fetch(target, { redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return { ok: false, reason: "unreachable" };
    }

    // Follow redirects ourselves, so each new address is checked too
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return { ok: false, reason: "unreachable" };
      current = new URL(next, target).toString();
      continue;
    }
    if (!res.ok || !res.body) return { ok: false, reason: "unreachable" };

    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return { ok: false, reason: "too_large" };

    // Read with a size limit, in case the server doesn't send content-length
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) {
        await reader.cancel();
        return { ok: false, reason: "too_large" };
      }
      chunks.push(value);
    }
    return { ok: true, text: new TextDecoder().decode(Buffer.concat(chunks)) };
  }

  return { ok: false, reason: "unreachable" }; // too many redirects
}

/** True when the host resolves only to public internet addresses (not localhost or a private network). */
async function isPublicHost(hostname: string): Promise<boolean> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;

  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  } catch {
    return false;
  }
  return addresses.length > 0 && addresses.every((ip) => !isPrivateIp(ip));
}

function isPrivateIp(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}