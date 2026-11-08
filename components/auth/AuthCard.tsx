import type { ReactNode } from "react";
import { Container } from "@/components/ui/Layout";

/** The small centred card the login, password and email pages use. */
export default function AuthCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Container className="flex justify-center py-16">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-1 mb-6 text-sm text-muted-foreground">{description}</p>}
        {children}
      </div>
    </Container>
  );
}
