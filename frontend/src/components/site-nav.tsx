"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BackendStatusBadge } from "@/components/backend-status-badge";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/chat", label: "Copilot" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 rounded-full border border-[color:var(--border-strong)] bg-[color:rgba(5,10,18,0.7)] px-4 py-3 shadow-[var(--shadow-strong)] backdrop-blur-xl">
        <Link className="flex items-center gap-3" href="/">
          <div className="grid size-10 place-items-center rounded-full border border-[color:rgba(255,255,255,0.16)] bg-[color:rgba(255,255,255,0.04)] text-sm font-semibold text-[color:var(--text-strong)]">
            SA
          </div>
          <div>
            <p
              className="text-sm font-semibold tracking-[0.02em] text-[color:var(--text-strong)]"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              Signal Atlas
            </p>
            <p className="text-xs text-[color:var(--text-soft)]">availability map</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] p-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "bg-[color:var(--surface-strong)] text-[color:var(--text-strong)]"
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
