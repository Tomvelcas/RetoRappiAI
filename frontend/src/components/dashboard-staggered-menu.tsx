"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type DashboardStaggeredMenuItem = Readonly<{
  ariaLabel: string;
  description?: string;
  href: string;
  label: string;
  shortLabel?: string;
}>;

type DashboardStaggeredMenuProps = Readonly<{
  items: readonly DashboardStaggeredMenuItem[];
}>;

const layerDelays = ["0ms", "45ms", "90ms"];

export function DashboardStaggeredMenu({
  items,
}: DashboardStaggeredMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!shellRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    globalThis.addEventListener("keydown", handleKeyDown);
    globalThis.addEventListener("mousedown", handlePointerDown);

    return () => {
      globalThis.removeEventListener("keydown", handleKeyDown);
      globalThis.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div className="relative z-40" ref={shellRef}>
      <button
        aria-controls="dashboard-staggered-menu"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        className={[
          "group inline-flex size-12 items-center justify-center rounded-full border transition",
          "border-[color:rgba(255,124,45,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent_18%),linear-gradient(135deg,rgba(255,124,45,0.12),rgba(20,6,3,0.94))] text-[color:#fff6f0] shadow-[0_22px_48px_rgba(0,0,0,0.28),0_0_18px_rgba(255,96,18,0.08)] backdrop-blur-xl",
          open ? "ring-1 ring-[color:rgba(255,122,31,0.24)]" : "hover:border-[color:rgba(255,122,31,0.3)]",
        ].join(" ")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span
          className={[
            "relative inline-flex h-4 w-5 items-center justify-center transition-transform duration-300",
          ].join(" ")}
        >
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300",
              open ? "translate-y-0 rotate-45" : "-translate-y-[5px]",
            ].join(" ")}
          />
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300",
              open ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-300",
              open ? "translate-y-0 -rotate-45" : "translate-y-[5px]",
            ].join(" ")}
          />
        </span>
      </button>

      <div
        className={[
          "fixed inset-0 z-30 transition",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <button
          aria-hidden={!open}
          className="absolute inset-0 bg-[rgba(7,3,2,0.56)] backdrop-blur-[6px]"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          type="button"
        />
      </div>

      <div
        className={[
          "fixed inset-y-0 left-0 z-40 w-[min(320px,84vw)]",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {layerDelays.map((delay, index) => (
          <div
            className={[
              "absolute inset-y-0 left-0 w-full transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "translate-x-0" : "-translate-x-[112%]",
            ].join(" ")}
            key={delay}
            style={{
              background:
                index === 0
                  ? "linear-gradient(180deg, rgba(255,128,44,0.72), rgba(255,88,10,0.64))"
                  : index === 1
                    ? "linear-gradient(180deg, rgba(84,26,10,0.96), rgba(36,12,5,0.98))"
                    : "linear-gradient(180deg, rgba(14,5,3,0.995), rgba(7,2,1,0.995))",
              transitionDelay: open ? delay : "0ms",
            }}
          />
        ))}

        <aside
          className={[
            "absolute inset-y-0 left-0 flex w-full flex-col px-5 pb-6 pt-20 text-[color:#fff8f4] transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0" : "-translate-x-[108%]",
          ].join(" ")}
          id="dashboard-staggered-menu"
          style={{ transitionDelay: open ? "120ms" : "0ms" }}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center gap-3">
              <span className="copilot-brand-mark" />
              <p className="eyebrow text-[10px] text-[color:rgba(255,240,232,0.56)]">
                navegación
              </p>
            </div>

            <p
              className="mt-6 text-[1.8rem] font-semibold tracking-[-0.06em] text-[color:#fff8f4]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              Menú
            </p>

            <ul className="mt-8 space-y-2" role="list">
              {items.map((item, index) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname?.startsWith(item.href);

                return (
                  <li
                    className={[
                      "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
                    ].join(" ")}
                    key={item.href}
                    style={{
                      transitionDelay: open ? `${180 + index * 70}ms` : "0ms",
                    }}
                  >
                    <Link
                      aria-label={item.ariaLabel}
                      className={[
                        "group flex items-center justify-between rounded-[20px] border px-4 py-3.5 transition",
                        isActive
                          ? "border-[color:rgba(255,181,139,0.18)] bg-[linear-gradient(135deg,rgba(255,122,31,0.26),rgba(255,122,31,0.08)_48%,rgba(255,255,255,0.04))] shadow-[0_0_24px_rgba(255,106,22,0.12)]"
                          : "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.04)] hover:border-[color:rgba(255,181,139,0.16)] hover:bg-[color:rgba(255,255,255,0.07)]",
                      ].join(" ")}
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      <p
                        className="text-[1.15rem] font-semibold tracking-[-0.04em]"
                        style={{ fontFamily: "var(--font-heading), serif" }}
                      >
                        {item.label}
                      </p>

                      <span className="rounded-full border border-[color:rgba(255,255,255,0.12)] px-3 py-2 text-[10px] uppercase tracking-[0.2em] text-[color:rgba(255,240,232,0.72)]">
                        {item.shortLabel ?? `0${index + 1}`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="mt-auto pt-6">
              <button
                className="w-full rounded-[18px] border border-[color:rgba(255,255,255,0.1)] bg-[color:rgba(255,255,255,0.05)] px-4 py-3 text-left text-sm text-[color:rgba(255,240,232,0.72)] transition hover:border-[color:rgba(255,181,139,0.16)] hover:text-[color:#fff8f4]"
                onClick={() => setOpen(false)}
                type="button"
              >
                Cerrar
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
