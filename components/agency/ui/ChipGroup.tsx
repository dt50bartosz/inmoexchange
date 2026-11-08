type Props = {
  legend: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  error?: string;
};

export default function ChipGroup({ legend, options, selected, onToggle, error }: Props) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o);
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(o)}
              className={`rounded-full border px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                on
                  ? "border-primary bg-secondary text-primary-hover"
                  : "border-border bg-white text-muted-foreground hover:border-border-strong"
              }`}
            >
              {on && (
                <span aria-hidden className="mr-1">
                  ✓
                </span>
              )}
              {o}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </fieldset>
  );
}
