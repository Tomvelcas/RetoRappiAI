"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BackendStatusBadge } from "@/components/backend-status-badge";

const navItems = [
  { href: "/", label: "Canvas" },
  { href: "/chat", label: "Copiloto" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-4 rounded-[28px] border border-[color:var(--border)] bg-[color:rgba(255,252,247,0.82)] px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid size-11 place-items-center rounded-[18px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(21,125,120,0.14),rgba(255,255,255,0.88))] text-sm font-semibold text-[color:var(--text-strong)]">
            24
          </div>
          <div>
            <p
              className="text-base font-semibold tracking-[-0.03em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              Panel de disponibilidad
            </p>
            <p className="text-xs text-[color:var(--text-soft)]">canvas y copiloto</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "bg-[color:var(--text-strong)] text-[color:var(--surface-strong)]"
                    : "text-[color:var(--text-soft)] hover:text-[color:var(--text-strong)]",
                ].join(" ")}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <BackendStatusBadge />
      </div>
    </header>
  );
}
