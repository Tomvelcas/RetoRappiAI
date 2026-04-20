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
    <aside className="panel rounded-[32px] border border-[color:var(--border)] p-5">
      <div className="flex items-center gap-2">
        <p className="eyebrow">Modo del copiloto</p>
        <InfoTooltip content="Estos controles deciden si la respuesta se queda 100% grounded, si solo pule el texto o si también incorpora hipótesis y contexto externo." />
      </div>

      <h2
        className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
        style={{ fontFamily: "var(--font-heading), serif" }}
      >
        Panel de respuesta
      </h2>

      <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
        El copiloto siempre usa analítica determinística para números. Aquí decide cuánto estilo y cuánto contexto adicional quiere encima.
      </p>

      <div className="mt-5 space-y-3">
        <ToggleSwitch
          checked={useLlm && llmReady}
          description="Mantiene la evidencia igual, pero mejora la redacción y la jerarquía narrativa."
          disabled={!llmReady}
          label="Pulir redacción"
          onCheckedChange={onUseLlmChange}
        />
        <ToggleSwitch
          checked={allowHypotheses && llmReady}
          description="Permite explicaciones tentativas claramente marcadas como hipótesis."
          disabled={!llmReady}
          label="Hipótesis tentativas"
          onCheckedChange={onAllowHypothesesChange}
        />
        <ToggleSwitch
          checked={allowWebResearch && llmReady}
          description="Solo úselo cuando realmente quiera contexto externo; nunca reemplaza el dataset."
          disabled={!llmReady || !allowHypotheses}
          label="Contexto web"
          onCheckedChange={onAllowWebResearchChange}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.72)] p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[color:var(--text-strong)]">
            Contexto adicional del operador
          </p>
          <InfoTooltip content="Úselo para promociones, incidentes internos, clima o campañas que usted ya conozca. El backend lo trata como contexto no verificado." />
        </div>
        <textarea
          className="glass-scroll mt-3 min-h-28 w-full resize-none rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3 text-sm leading-7 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
          onChange={(event) => onExternalContextChange(event.target.value)}
          placeholder="Ej: Hubo una promo masiva o reportes internos de latencia."
          value={externalContext}
        />
      </div>

      <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.72)] p-4">
        <p className="text-sm font-medium text-[color:var(--text-strong)]">Motor activo</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
            {llmReady ? "LLM listo" : "Solo grounded"}
          </span>
          <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
            {backendHealth?.chat.memory_enabled ? "Memoria del hilo" : "Sin memoria"}
          </span>
          {backendHealth?.llm.model ? (
            <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
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

      <div className="mt-5 rounded-[24px] border border-[color:var(--border)] bg-[linear-gradient(135deg,rgba(21,125,120,0.1),rgba(255,255,255,0.78))] p-4">
        <p className="text-sm font-medium text-[color:var(--text-strong)]">
          Widgets fijados desde chat
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]">
          {pinnedCount}
        </p>
        <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
          Puede fijar artifacts o respuestas y mandarlos al canvas del dashboard como piezas nuevas.
        </p>

        <Link
          className="mt-4 inline-flex rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
          href="/"
        >
          Abrir canvas
        </Link>
      </div>
    </aside>
  );
}
