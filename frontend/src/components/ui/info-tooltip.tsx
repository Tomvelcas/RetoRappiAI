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
    <span className="relative inline-flex">
      <button
        aria-describedby={open ? tooltipId : undefined}
        aria-label={label}
        className="inline-flex size-5 items-center justify-center rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] text-[11px] font-semibold text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
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
            "pointer-events-none absolute z-20 w-60 rounded-[18px] border border-[color:var(--border)] bg-[color:rgba(26,24,21,0.96)] px-3 py-2 text-xs leading-6 text-[color:#f7f2ea] shadow-[0_22px_48px_rgba(16,14,11,0.28)]",
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
