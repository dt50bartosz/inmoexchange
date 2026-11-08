import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

/** Two-column section: title + description on the left, content on the right. */
export default function PanelSection({ title, description, children }: Props) {
  return (
    <section className="grid gap-4 border-b p-5 last:border-b-0 sm:p-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm leading-snug text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
