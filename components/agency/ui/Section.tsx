import type { ReactNode } from "react";

type Props = {
  title: string;
  hint?: ReactNode;
  last?: boolean;
  children: ReactNode;
};

export default function Section({ title, hint, last, children }: Props) {
  return (
    <section
      className={`grid gap-4 p-5 sm:p-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8 ${
        last ? "" : "border-b border-border"
      }`}
    >
      <div>
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {hint && <p className="mt-1 text-sm leading-snug text-muted-foreground">{hint}</p>}
      </div>
      <div>{children}</div>
    </section>
  );
}
