"use client";

import Link from "next/link";

import type { BackendHealth } from "@/lib/api";

import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

type ChatSettingsPanelProps = Readonly<{
  allowHypotheses: boolean;
  allowWebResearch: boolean;
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

export function ChatSettingsPanel({
  allowHypotheses,
  allowWebResearch,
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
  return (
    <aside className="chat-shell-card glass-scroll order-3 rounded-[32px] p-5 xl:sticky xl:top-[104px] xl:max-h-[calc(100dvh-124px)] xl:overflow-y-auto">
      <div className="absolute inset-x-4 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,143,107,0.92),rgba(234,77,161,0.88),rgba(143,103,255,0.78),transparent)]" />
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-[color:rgba(234,77,161,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,244,237,0.86))] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[color:#7c4864]">
          <span className="copilot-brand-mark" />
          Motor
        </span>
        <InfoTooltip content="Estos controles deciden si la respuesta se queda 100% grounded, si solo pule el texto o si también incorpora hipótesis y contexto externo." />
      </div>

      <h2
        className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
        style={{ fontFamily: "var(--font-heading), serif" }}
      >
        Ajustes
      </h2>

      <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
        Defina cómo piensa y cómo redacta.
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
            {llmReady ? "LLM listo" : "Solo grounded"}
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
          Canvas vivo
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--copilot-text)]">
          {pinnedCount}
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--copilot-text-soft)]">
          Fije piezas útiles y súbalas al canvas.
        </p>

        <Link
          className="copilot-gradient-button mt-4 inline-flex rounded-full px-4 py-3 text-sm font-medium text-[color:#fff7f3] transition"
          href="/dashboard"
        >
          Abrir canvas
        </Link>
      </div>
    </aside>
  );
}
