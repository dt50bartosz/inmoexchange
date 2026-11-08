type Props = {
  visible: boolean;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export default function SaveBar({ visible, saving, onSave, onDiscard }: Props) {
  const tab = visible ? 0 : -1;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur transition-transform duration-200 motion-reduce:transition-none ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <p className="text-sm text-muted-foreground">You have unsaved changes.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDiscard}
            disabled={saving}
            tabIndex={tab}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            tabIndex={tab}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
