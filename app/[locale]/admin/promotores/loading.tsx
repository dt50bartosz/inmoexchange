/** Shown while a Developer CRM page loads its data. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8 lg:pt-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border bg-card motion-reduce:animate-none" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-xl border bg-card motion-reduce:animate-none" />
    </div>
  );
}
