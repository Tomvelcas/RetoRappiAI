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
    label: "checking",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadStatus() {
      try {
        const health = await getBackendHealth(controller.signal);

        setStatus({
          state: "online",
          label: health.environment === "local" ? "live locally" : health.environment,
        });
      } catch {
        if (!controller.signal.aborted) {
          setStatus({
            state: "offline",
            label: "offline",
          });
        }
      }
    }

    void loadStatus();

    return () => {
      controller.abort();
    };
  }, []);

  const tone =
    status.state === "online"
      ? "bg-[color:rgba(90,214,195,0.14)] text-[color:var(--signal-cyan)]"
      : status.state === "offline"
        ? "bg-[color:rgba(255,121,137,0.14)] text-[color:var(--signal-rose)]"
        : "bg-[color:rgba(255,188,92,0.14)] text-[color:var(--signal-amber)]";

  return (
    <div className="hidden items-center gap-2 rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[color:rgba(255,255,255,0.03)] px-3 py-2 sm:flex">
      <div
        className={[
          "size-2.5 rounded-full",
          status.state === "online"
            ? "bg-[color:var(--signal-cyan)] shadow-[0_0_0_6px_rgba(90,214,195,0.08)]"
            : status.state === "offline"
              ? "bg-[color:var(--signal-rose)] shadow-[0_0_0_6px_rgba(255,121,137,0.06)]"
              : "bg-[color:var(--signal-amber)] shadow-[0_0_0_6px_rgba(255,188,92,0.06)]",
        ].join(" ")}
      />
      <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--text-dim)]">
        backend
      </span>
      <span className={`rounded-full px-2 py-1 text-xs font-medium ${tone}`}>{status.label}</span>
    </div>
  );
}
