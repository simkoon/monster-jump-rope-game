export interface SegOption<T extends string> {
  value: T;
  label: string;
  // Semantic color key (easy/normal/hard, forward/backward/extra). When omitted
  // the selected button uses the plain --sky fallback.
  color?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

// Generic equal-flex segmented button group (UI-SPEC §Component Inventory
// Segmented control). The selected button fills with its semantic color via the
// CSS `.seg button.sel[data-v=…]` rules, or `.plain` (--sky) when no color key.
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const sel = o.value === value;
        const plain = !o.color;
        const cls = sel ? 'sel' + (plain ? ' plain' : '') : undefined;
        return (
          <button
            key={o.value}
            type="button"
            data-v={o.color ?? o.value}
            className={cls}
            aria-pressed={sel}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
