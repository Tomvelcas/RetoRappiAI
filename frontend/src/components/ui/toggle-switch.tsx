"use client";

type ToggleSwitchProps = Readonly<{
  checked: boolean;
  disabled?: boolean;
  label: string;
  description: string;
  onCheckedChange: (checked: boolean) => void;
}>;

export function ToggleSwitch({
  checked,
  disabled = false,
  label,
  description,
  onCheckedChange,
}: ToggleSwitchProps) {
  let wrapperTone =
    "border-[color:var(--border)] bg-[color:var(--surface-strong)] hover:border-[color:var(--border-strong)]";
  if (disabled) {
    wrapperTone =
      "cursor-not-allowed border-[color:var(--border)] bg-[color:rgba(255,255,255,0.45)] opacity-60";
  } else if (checked) {
    wrapperTone =
      "border-[color:rgba(21,125,120,0.24)] bg-[color:rgba(21,125,120,0.08)]";
  }

  return (
    <button
      aria-checked={checked}
      className={[
        "flex w-full items-start justify-between gap-4 rounded-[22px] border px-4 py-3 text-left transition",
        wrapperTone,
      ].join(" ")}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      role="switch"
      type="button"
    >
      <div>
        <p className="text-sm font-medium text-[color:var(--text-strong)]">{label}</p>
        <p className="mt-1 text-xs leading-6 text-[color:var(--text-soft)]">{description}</p>
      </div>

      <span
        className={[
          "relative mt-0.5 inline-flex h-7 w-12 shrink-0 rounded-full border transition",
          checked
            ? "border-[color:rgba(21,125,120,0.24)] bg-[color:rgba(21,125,120,0.2)]"
            : "border-[color:var(--border)] bg-[color:rgba(32,27,23,0.08)]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 inline-flex size-5 rounded-full bg-[color:var(--surface-strong)] shadow-[0_8px_14px_rgba(22,18,13,0.18)] transition",
            checked ? "left-6" : "left-1",
          ].join(" ")}
        />
      </span>
    </button>
  );
}
