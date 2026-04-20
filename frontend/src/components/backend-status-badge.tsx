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
    label: "revisando",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const health = await getBackendHealth(controller.signal);
        setStatus({
          state: "online",
          label:
            health.environment === "local"
              ? health.llm.ready
                ? "en línea + redacción"
                : "en línea"
              : health.environment,
        });
      } catch {
        if (!controller.signal.aborted) {
          setStatus({
            state: "offline",
            label: "sin conexión",
          });
        }
      }
    }

    void loadStatus();

    return () => controller.abort();
  }, []);

  const tone =
    status.state === "online"
      ? "bg-[color:rgba(21,125,120,0.12)] text-[color:var(--signal-cyan)]"
      : status.state === "offline"
        ? "bg-[color:rgba(178,76,89,0.12)] text-[color:var(--signal-rose)]"
      : "bg-[color:rgba(176,108,31,0.12)] text-[color:var(--signal-amber)]";

  return (
    <div className="hidden items-center gap-3 rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 sm:flex">
      <div
        className={[
          "size-2.5 rounded-full",
          status.state === "online"
            ? "bg-[color:var(--signal-cyan)]"
            : status.state === "offline"
              ? "bg-[color:var(--signal-rose)]"
              : "bg-[color:var(--signal-amber)]",
        ].join(" ")}
      />
      <span className="text-xs uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
        motor
      </span>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{status.label}</span>
    </div>
  );
}
