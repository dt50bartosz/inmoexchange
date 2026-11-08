import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Logo from "@/components/Logo";

/** The logo on the landing's navy header and footer (white lettering). Links home. */
export default async function Wordmark({ className = "", priority = false }: { className?: string; priority?: boolean }) {
  const t = await getTranslations("landing");
  return (
    <Link href="/" aria-label={t("nav.home")} className={`inline-flex items-center ${className}`}>
      <Logo onDark priority={priority} className="h-9 sm:h-10" />
    </Link>
  );
}
