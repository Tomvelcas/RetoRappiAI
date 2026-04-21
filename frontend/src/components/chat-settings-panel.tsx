"use client";

import Link from "next/link";

import type { BackendHealth } from "@/lib/api";

import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type ChatSettingsPanelProps = Readonly<{
  allowHypotheses: boolean;
  allowWebResearch: boolean;
  compact?: boolean;
  externalContext: string;
  llmReady: boolean;
  notice: string | null;
  pinnedCount: number;
  useLlm: boolean;
  backendHealth: BackendHealth | null;
  onAllowHypothesesChange: (value: boolean) => void;
  onAllowWebResearchChange: (value: boolean) => void;
  onExternalContextChange: (value: string) => void;
  onUseLlmChange: (value: boolean) => void;
}>;

function CompactModeSwitch({
  active,
  caption,
  disabled,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  caption?: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <button
      className={[
        "group inline-flex min-h-[68px] w-full items-center justify-between gap-4 rounded-[18px] border px-4 py-3 text-left transition",
        disabled
          ? "cursor-not-allowed border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.48)] text-[color:rgba(67,58,49,0.42)]"
          : active
            ? "border-[color:rgba(255,122,31,0.26)] bg-[linear-gradient(135deg,rgba(255,122,31,0.18),rgba(255,255,255,0.92)_34%,rgba(255,194,160,0.56))] text-[color:#2a1408] shadow-[0_16px_34px_rgba(255,122,31,0.14),inset_0_1px_0_rgba(255,255,255,0.68)]"
            : "border-[color:rgba(67,57,47,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(246,241,235,0.7))] text-[color:rgba(67,58,49,0.72)] hover:border-[color:rgba(255,122,31,0.18)] hover:text-[color:#2a1408]",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      role="switch"
      aria-checked={active}
      type="button"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-medium leading-5">{label}</span>
        {caption ? (
          <span className="mt-1 block text-[10px] uppercase tracking-[0.18em] text-[color:rgba(67,58,49,0.46)]">
            {caption}
          </span>
        ) : null}
      </span>

      <span
        className={[
          "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition",
          active
            ? "border-[color:rgba(255,122,31,0.28)] bg-[linear-gradient(135deg,rgba(255,122,31,0.42),rgba(255,190,144,0.76))] shadow-[0_0_18px_rgba(255,122,31,0.2)]"
            : "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(67,57,47,0.08)]",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-1 inline-flex size-5 rounded-full shadow-[0_8px_18px_rgba(18,14,10,0.18)] transition-all duration-300",
            active
              ? "left-6 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,231,214,0.92))]"
              : "left-1 bg-[color:#fff9f4]",
          ].join(" ")}
        />
      </span>
    </button>
  );
}

export function ChatSettingsPanel({
  allowHypotheses,
  allowWebResearch,
  compact = false,
  externalContext,
  llmReady,
  notice,
  pinnedCount,
  useLlm,
  backendHealth,
  onAllowHypothesesChange,
  onAllowWebResearchChange,
  onExternalContextChange,
  onUseLlmChange,
}: ChatSettingsPanelProps) {
  if (compact) {
    return (
      <section className="chat-inline-controls px-3 py-3 sm:px-4 sm:py-4">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.78)] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:rgba(67,58,49,0.7)]">
                  <span className="copilot-brand-mark" />
                  Opciones
                </span>
                <InfoTooltip
                  content="Active solo lo necesario: redacción para pulir, hipótesis para explorar y web para contrastar afuera."
                  side="right"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.72)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[color:rgba(67,58,49,0.62)]">
                {pinnedCount} fijados
              </span>
              <Link
                className="rounded-full border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.74)] px-3 py-2 text-xs font-medium text-[color:rgba(42,20,8,0.82)] transition hover:border-[color:rgba(255,122,31,0.18)]"
                href="/dashboard"
              >
                Abrir dashboard
              </Link>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            <CompactModeSwitch
              active={useLlm && llmReady}
              caption="pulir"
              disabled={!llmReady}
              label="Redacción"
              onClick={() => onUseLlmChange(!(useLlm && llmReady))}
            />
            <CompactModeSwitch
              active={allowHypotheses && llmReady}
              caption="explorar"
              disabled={!llmReady}
              label="Hipótesis"
              onClick={() => onAllowHypothesesChange(!(allowHypotheses && llmReady))}
            />
            <CompactModeSwitch
              active={allowWebResearch && llmReady}
              caption="contrastar"
              disabled={!llmReady || !allowHypotheses}
              label="Web"
              onClick={() => onAllowWebResearchChange(!(allowWebResearch && llmReady))}
            />
          </div>

          <details className="mt-3 rounded-[18px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.7)] px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--text-strong)]">
              Añadir contexto
            </summary>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
              Úselo para promos, incidentes internos o señales externas conocidas por su equipo.
            </p>
            <textarea
              className="glass-scroll mt-3 min-h-20 w-full resize-none rounded-[16px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.84)] px-3 py-3 text-sm leading-7 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
              onChange={(event) => onExternalContextChange(event.target.value)}
              placeholder="Ej: Hubo una promo masiva o reportes internos de latencia."
              value={externalContext}
            />
          </details>

          {notice ? (
            <div className="mt-3 rounded-[18px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-4 py-3 text-sm leading-6 text-[color:var(--signal-amber)]">
              {notice}
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <aside className="chat-shell-card glass-scroll order-3 rounded-[32px] p-5 xl:sticky xl:top-[104px] xl:max-h-[calc(100dvh-124px)] xl:overflow-y-auto">
      <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,143,107,0.92),rgba(234,77,161,0.88),rgba(143,103,255,0.78),transparent)]" />
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(234,77,161,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,244,237,0.86))] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:#7c4864]">
          <span className="copilot-brand-mark" />
          Motor
        </span>
        <InfoTooltip content="Estos controles definen si la respuesta se limita al dato, si mejora la redacción o si también suma hipótesis y contexto externo." />
      </div>

      <h2
        className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
        style={{ fontFamily: "var(--font-heading), serif" }}
      >
        Control
      </h2>

      <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
        Ajuste cómo responde el asistente.
      </p>

      <div className="mt-5 space-y-3">
        <ToggleSwitch
          checked={useLlm && llmReady}
          description="Pule la salida."
          disabled={!llmReady}
          label="Pulir redacción"
          onCheckedChange={onUseLlmChange}
        />
        <ToggleSwitch
          checked={allowHypotheses && llmReady}
          description="Abre lectura tentativa."
          disabled={!llmReady}
          label="Hipótesis tentativas"
          onCheckedChange={onAllowHypothesesChange}
        />
        <ToggleSwitch
          checked={allowWebResearch && llmReady}
          description="Añade contexto externo."
          disabled={!llmReady || !allowHypotheses}
          label="Contexto web"
          onCheckedChange={onAllowWebResearchChange}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-[color:rgba(234,77,161,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,248,242,0.72))] p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[color:var(--text-strong)]">
            Contexto extra
          </p>
          <InfoTooltip content="Úselo para promociones, incidentes internos, clima o campañas que usted ya conozca. El backend lo trata como contexto no verificado." />
        </div>
        <textarea
          className="glass-scroll mt-3 min-h-28 w-full resize-none rounded-[18px] border border-[color:rgba(234,77,161,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,249,244,0.9))] px-3 py-3 text-sm leading-7 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
          onChange={(event) => onExternalContextChange(event.target.value)}
          placeholder="Ej: Hubo una promo masiva o reportes internos de latencia."
          value={externalContext}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-[color:rgba(234,77,161,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,248,242,0.72))] p-4">
        <p className="text-sm font-medium text-[color:var(--text-strong)]">Ruta activa</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="copilot-pill rounded-full px-3 py-1 text-xs">
            {llmReady ? "Motor listo" : "Solo datos"}
          </span>
          <span className="copilot-pill rounded-full px-3 py-1 text-xs">
            {backendHealth?.chat.memory_enabled ? "Memoria del hilo" : "Sin memoria"}
          </span>
          {backendHealth?.llm.model ? (
            <span className="copilot-pill rounded-full px-3 py-1 text-xs">
              {backendHealth.llm.model}
            </span>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div className="mt-5 rounded-[22px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-4 py-3 text-sm leading-6 text-[color:var(--signal-amber)]">
          {notice}
        </div>
      ) : null}

      <div className="copilot-dark-panel mt-5 rounded-[24px] p-4">
        <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,143,107,0.92),rgba(234,77,161,0.88),rgba(143,103,255,0.78),transparent)]" />
        <p className="text-sm font-medium text-[color:var(--copilot-text)]">
          Tablero activo
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--copilot-text)]">
          {pinnedCount}
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--copilot-text-soft)]">
          Hallazgos fijados para el tablero.
        </p>

        <Link
          className="copilot-gradient-button mt-4 inline-flex rounded-full px-4 py-3 text-sm font-medium text-[color:#fff7f3] transition"
          href="/dashboard"
        >
          Abrir tablero
        </Link>
      </div>
    </aside>
  );
}
