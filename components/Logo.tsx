import Image from "next/image";
import logo from "@/public/brand/logo.png";
import logoOnDark from "@/public/brand/logo-on-dark.png";

/**
 * The Colabora MLS logo (files made from public/logo.webp by scripts/build-logo.mjs).
 * onDark: the version with white lettering, for navy backgrounds. Height comes from className (e.g. "h-8"), width follows.
 * Plain markup, so it works in server and client components.
 */
export default function Logo({ onDark = false, className = "h-8", priority = false }: { onDark?: boolean; className?: string; priority?: boolean }) {
  return (
    <Image
      src={onDark ? logoOnDark : logo}
      alt="Colabora MLS"
      priority={priority}
      sizes="240px"
      className={`w-auto ${className}`}
    />
  );
}
