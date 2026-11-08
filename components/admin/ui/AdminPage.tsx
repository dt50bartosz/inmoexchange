import type { ReactNode } from "react";

type Props = { title: string; description?: string; actions?: ReactNode; children: ReactNode; back?: ReactNode };

export default function AdminPage({ title, description, actions, children, back }: Props) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      {back}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}
