"use client";

import { useCallback, useEffect, useState } from "react";

export type ToastMsg = { kind: "ok" | "error"; text: string };

/** Holds the current toast message and hides it automatically. */
export function useToastMessage(duration = 3500) {
  const [toast, setToast] = useState<ToastMsg | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(t);
  }, [toast, duration]);

  const success = useCallback((text: string) => setToast({ kind: "ok", text }), []);
  const error = useCallback((text: string) => setToast({ kind: "error", text }), []);

  return { toast, success, error };
}

export default function Toast({ toast }: { toast: ToastMsg | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-50">
      {toast && (
        <div
          role="status"
          className={`pointer-events-auto rounded-md px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.kind === "ok" ? "bg-foreground" : "bg-destructive"
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
