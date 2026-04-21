"use client";

import { useId, useState } from "react";

type InfoTooltipProps = Readonly<{
  content: string;
  label?: string;
  side?: "top" | "right";
}>;

export function InfoTooltip({
  content,
  label = "Más información",
  side = "top",
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex overflow-visible">
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full border border-[color:rgba(234,77,161,0.16)] bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,242,236,0.86))] text-[11px] font-semibold text-[color:#7f4967] transition hover:border-[color:rgba(234,77,161,0.28)] hover:text-[color:var(--text-strong)]"
        onBlur={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        type="button"
      >
        i
      </button>

      {open ? (
        <span
          className={[
            "pointer-events-none absolute z-50 w-60 rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(41,28,36,0.98),rgba(18,12,18,0.96))] px-3 py-2 text-xs leading-6 text-[color:#f7f2ea] shadow-[0_22px_48px_rgba(16,14,11,0.28)]",
            side === "right"
              ? "left-full top-1/2 ml-3 -translate-y-1/2"
              : "bottom-full left-1/2 mb-3 -translate-x-1/2",
          ].join(" ")}
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
