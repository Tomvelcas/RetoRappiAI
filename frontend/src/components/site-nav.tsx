"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BackendStatusBadge } from "@/components/backend-status-badge";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/chat", label: "Copilot" },
];

export function SiteNav() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/dashboard") {
    return null;
  }

  const isStarterPage = false;

  return (
    <header className="sticky top-0 z-30 px-4 pt-4 sm:px-6 lg:px-8">
      <div
        className="dashboard-command-bar mx-auto relative flex max-w-[1380px] items-center justify-between gap-4 rounded-[28px] px-4 py-3"
      >
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,143,107,0.8),rgba(255,90,0,0.72),rgba(93,39,16,0.4),transparent)]" />
        <Link className="flex items-center gap-3" href="/">
          <div
            className={[
              "grid size-11 place-items-center rounded-[18px] border text-sm font-semibold",
              isStarterPage
                ? "border-[color:rgba(255,255,255,0.14)] bg-[linear-gradient(135deg,rgba(255,143,107,0.28),rgba(143,103,255,0.18))] text-[color:#fff7f3]"
                : "border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(255,194,161,0.42),rgba(255,255,255,0.9))] text-[color:var(--text-strong)]",
            ].join(" ")}
          >
            M
          </div>
          <div>
            <p
              className={[
                "text-base font-semibold tracking-[-0.03em]",
                isStarterPage ? "text-[color:#fff7f3]" : "text-[color:var(--text-strong)]",
              ].join(" ")}
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              Availability Studio
            </p>
            <p
              className={[
                "text-xs",
                isStarterPage ? "text-[color:rgba(255,239,232,0.62)]" : "text-[color:var(--text-soft)]",
              ].join(" ")}
            >
              starter + dashboard + copilot
            </p>
          </div>
        </Link>

        <nav
          className={[
            "flex items-center gap-2 rounded-full border p-1",
            isStarterPage
              ? "border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.05)]"
              : "border-[color:rgba(72,43,24,0.1)] bg-[color:rgba(255,255,255,0.78)]",
          ].join(" ")}
        >
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                className={[
                  "rounded-full px-4 py-2 text-sm transition",
                  isActive
                    ? "copilot-gradient-button text-[color:#fff7f3]"
                    : isStarterPage
                      ? "text-[color:rgba(255,238,231,0.72)] hover:text-white"
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
