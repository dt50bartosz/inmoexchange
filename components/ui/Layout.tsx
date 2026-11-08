import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("max-w-6xl mx-auto px-6", className)} />;
}

type SectionProps = ComponentProps<"section"> & {
  /** surface: warm off-white band, to alternate with white sections */
  tone?: "default" | "surface";
};

export function Section({ className, tone = "default", ...props }: SectionProps) {
  return (
    <section
      {...props}
      className={cn(
        "py-20 sm:py-24",
        tone === "surface" && "bg-surface border-y border-border",
        className,
      )}
    />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl mb-14", align === "center" && "text-center mx-auto")}>
      {eyebrow && <p className="eyebrow mb-4">{eyebrow}</p>}
      <h2 className="text-3xl sm:text-4xl font-normal leading-tight tracking-tight text-foreground">{title}</h2>
      {subtitle && <p className="mt-4 text-lg leading-8 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
