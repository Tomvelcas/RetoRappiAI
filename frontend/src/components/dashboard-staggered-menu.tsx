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

const layerDelays = ["0ms", "110ms", "220ms"];

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
          "group relative inline-flex size-14 items-center justify-center overflow-hidden rounded-full border transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "border-[color:rgba(255,124,45,0.22)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent_18%),linear-gradient(135deg,rgba(255,124,45,0.16),rgba(20,6,3,0.95))] text-[color:#fff6f0] shadow-[0_26px_64px_rgba(0,0,0,0.32),0_0_26px_rgba(255,96,18,0.14)] backdrop-blur-xl",
          open
            ? "scale-[1.04] ring-1 ring-[color:rgba(255,122,31,0.3)]"
            : "hover:scale-[1.03] hover:border-[color:rgba(255,122,31,0.36)] hover:shadow-[0_30px_72px_rgba(0,0,0,0.36),0_0_30px_rgba(255,96,18,0.18)]",
        ].join(" ")}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="pointer-events-none absolute inset-[8%] rounded-full bg-[radial-gradient(circle,rgba(255,152,84,0.16),transparent_68%)] transition duration-700 group-hover:scale-110" />
        <span
          className={[
            "relative inline-flex h-4 w-5 items-center justify-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "scale-105" : "",
          ].join(" ")}
        >
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-500",
              open ? "translate-y-0 rotate-45" : "-translate-y-[5px]",
            ].join(" ")}
          />
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-500",
              open ? "opacity-0" : "opacity-100",
            ].join(" ")}
          />
          <span
            className={[
              "absolute h-0.5 w-5 rounded-full bg-current transition-all duration-500",
              open ? "translate-y-0 -rotate-45" : "translate-y-[5px]",
            ].join(" ")}
          />
        </span>
      </button>

      <div
        className={[
          "fixed inset-0 z-30 transition duration-500",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <button
          aria-hidden={!open}
          className="absolute inset-0 bg-[rgba(7,3,2,0.64)] backdrop-blur-[10px]"
          onClick={() => setOpen(false)}
          tabIndex={open ? 0 : -1}
          type="button"
        />
      </div>

      <div
        className={[
          "fixed inset-y-0 left-0 z-40 w-[min(360px,86vw)]",
          open ? "pointer-events-auto" : "pointer-events-none",
        ].join(" ")}
      >
        {layerDelays.map((delay, index) => (
          <div
            className={[
              "absolute inset-y-0 left-0 w-full transition-transform ease-[cubic-bezier(0.22,1,0.36,1)]",
              open ? "translate-x-0" : "-translate-x-[124%]",
            ].join(" ")}
            key={delay}
            style={{
              background:
                index === 0
                  ? "linear-gradient(180deg, rgba(255,128,44,0.72), rgba(255,88,10,0.64))"
                  : index === 1
                    ? "linear-gradient(180deg, rgba(84,26,10,0.96), rgba(36,12,5,0.98))"
                    : "linear-gradient(180deg, rgba(14,5,3,0.995), rgba(7,2,1,0.995))",
              transitionDuration: `${760 + index * 120}ms`,
              transitionDelay: open ? delay : "0ms",
            }}
          />
        ))}

        <aside
          className={[
            "absolute inset-y-0 left-0 flex w-full flex-col px-6 pb-6 pt-24 text-[color:#fff8f4] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? "translate-x-0 opacity-100" : "-translate-x-[112%] opacity-0",
          ].join(" ")}
          id="dashboard-staggered-menu"
          style={{
            transitionDelay: open ? "240ms" : "0ms",
            transitionDuration: open ? "980ms" : "520ms",
          }}
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
                      "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "translate-x-0 translate-y-0 opacity-100" : "-translate-x-8 translate-y-10 opacity-0",
                    ].join(" ")}
                    key={item.href}
                    style={{
                      transitionDelay: open ? `${360 + index * 110}ms` : "0ms",
                      transitionDuration: open ? "760ms" : "320ms",
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
