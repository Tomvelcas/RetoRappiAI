"use client";

import { useEffect, useState } from "react";

import { getBackendHealth } from "@/lib/api";

type StatusState =
  | { state: "loading"; label: string }
  | { state: "online"; label: string }
  | { state: "offline"; label: string };

export function BackendStatusBadge() {
  const [status, setStatus] = useState<StatusState>({
    state: "loading",
    label: "Checking backend",
  });

  useEffect(() => {
    let cancelled = false;

    async function loadStatus() {
      try {
        const health = await getBackendHealth();

        if (!cancelled) {
          setStatus({
            state: "online",
            label: `${health.status.toUpperCase()} · ${health.environment}`,
          });
        }
      } catch {
        if (!cancelled) {
          setStatus({
            state: "offline",
            label: "Backend unreachable",
          });
        }
      }
    }

    void loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const tone =
    status.state === "online"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status.state === "offline"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          API Status
        </p>
        <p className={`mt-2 rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}>
          {status.label}
        </p>
      </div>
    </div>
  );
}
