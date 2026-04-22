"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChatArtifactView } from "@/components/chat-artifact";
import { ChatThinkingCore } from "@/components/chat-thinking-core";
import { DashboardStaggeredMenu } from "@/components/dashboard-staggered-menu";
import { LandingParticleField } from "@/components/effects/landing-particle-field";
import type { BackendHealth, ChatQueryResponse } from "@/lib/api";
import { getBackendHealth, queryChat } from "@/lib/api";
import { pinArtifactWidget } from "@/lib/dashboard-store";
import {
  clearChatSessionsStorage,
  createBlankSession,
  loadChatSessions,
  saveChatSessions,
  sessionTitleFromQuestion,
  type StoredChatSession,
} from "@/lib/chat-store";
import {
  confidenceLabel,
  coverageChip,
  formatLongDate,
  modeLabel,
  sourceLabel,
} from "@/lib/format";

type ChatWorkspaceProps = Readonly<{
  initialQuestion?: string | null;
}>;

const starterPrompts = [
  "¿Qué pasó el 2026-02-10?",
  "Muéstreme los días con menor cobertura.",
  "Compare entre semana contra fines de semana.",
  "¿Cuál fue la hora con menor cobertura el 11 de febrero?",
];

const chatMenuItems = [
  {
    ariaLabel: "Ir a inicio",
    href: "/",
    label: "Inicio",
    shortLabel: "00",
  },
  {
    ariaLabel: "Ir al dashboard",
    href: "/dashboard",
    label: "Dashboard",
    shortLabel: "01",
  },
  {
    ariaLabel: "Ir al chat",
    href: "/chat",
    label: "Chat",
    shortLabel: "02",
  },
] as const;

const greetingFaces = [
  {
    fontFamily: "var(--font-brand), 'Brush Script MT', cursive",
    tone: "text-[color:rgba(42,26,18,0.98)] tracking-[-0.08em]",
  },
  {
    fontFamily: "var(--font-heading), 'Iowan Old Style', 'Palatino Linotype', serif",
    tone: "text-[color:rgba(70,44,31,0.94)] italic tracking-[-0.07em]",
  },
  {
    fontFamily:
      "\"Avenir Next Condensed\", \"IBM Plex Sans\", var(--font-body), sans-serif",
    tone: "text-[color:rgba(50,34,24,0.9)] tracking-[-0.06em]",
  },
] as const;

function relativeTimeLabel(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function greetingLabel(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Buenos días";
  }

  if (hour < 19) {
    return "Buenas tardes";
  }

  return "Buenas noches";
}

function sortSessionsByRecent(sessions: StoredChatSession[]) {
  return [...sessions].sort(
    (left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

function asArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function splitAnswer(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function llmBannerCopy(health: BackendHealth | null): string | null {
  if (!health || health.llm.ready) {
    return null;
  }

  if (health.llm.enabled) {
    return "La redacción enriquecida está configurada pero el motor aún no quedó listo. Si acaba de cambiar .env o reinició contenedores, espere y refresque.";
  }

  return "El motor activo está en modo solo datos. Si ya cambió .env, reinicie el backend para habilitar redacción enriquecida.";
}

function summarizeEvidence(payload: ChatQueryResponse | undefined) {
  return asArray(payload?.evidence).slice(0, 3);
}

function assistantEyebrow(payload: ChatQueryResponse | undefined): string {
  if (!payload) {
    return "Respuesta basada en datos";
  }

  const mapping: Record<string, string> = {
    day_briefing: "Resumen del día",
    daily_coverage_profile: "Cobertura diaria",
    hourly_coverage_profile: "Cobertura horaria",
    hourly_coverage_lookup: "Consulta horaria",
    weekday_weekend_comparison: "Entre semana vs fin de semana",
    weekend_coverage_report: "Reporte de fin de semana",
    coverage_extremes: "Resumen de cobertura",
    data_quality_status: "Calidad del dato",
    anomaly_review: "Revisión de anomalías",
    intraday_pattern: "Patrón horario",
    metric_definition: "Definición métrica",
    unsupported_request: "Límite del dato",
  };

  return mapping[payload.intent] ?? "Respuesta basada en datos";
}

function assistantSubline(payload: ChatQueryResponse | undefined): string {
  if (!payload?.time_window) {
    return "Respuesta anclada al dato.";
  }

  const start = payload.time_window.effective_start;
  const end = payload.time_window.effective_end;
  const scope =
    start === end
      ? formatLongDate(start)
      : `${formatLongDate(start)} a ${formatLongDate(end)}`;

  if (payload.answer_mode === "llm_enhanced") {
    if (payload.web_research_used) {
      return `Base en ${scope} con contexto externo separado.`;
    }
    return `Base en ${scope} con mejor redacción.`;
  }

  if (payload.answer_mode === "deterministic_fallback") {
    return `Base en ${scope}. Quedó en modo solo datos.`;
  }

  return `Base en ${scope}.`;
}

function pinSuccessCopy(kind: "artifact" | "note"): string {
  return kind === "artifact"
    ? "Widget fijado en el tablero."
    : "Nota fijada en el tablero.";
}

function composerModeTone(active: boolean, disabled = false): string {
  if (disabled) {
    return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.44)] text-[color:rgba(67,58,49,0.38)]";
  }

  if (active) {
    return "border-[color:rgba(255,122,31,0.24)] bg-[linear-gradient(135deg,rgba(255,122,31,0.14),rgba(255,255,255,0.9))] text-[color:#2a1408] shadow-[0_10px_20px_rgba(255,122,31,0.08)]";
  }

  return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.62)] text-[color:rgba(67,58,49,0.7)] hover:border-[color:rgba(255,122,31,0.18)] hover:text-[color:#2a1408]";
}

function composerSwitchTrack(active: boolean, disabled = false): string {
  if (disabled) {
    return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(67,57,47,0.08)]";
  }

  if (active) {
    return "border-[color:rgba(255,122,31,0.28)] bg-[linear-gradient(135deg,rgba(255,122,31,0.42),rgba(255,190,144,0.76))]";
  }

  return "border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(67,57,47,0.08)]";
}

function composerSwitchThumb(active: boolean, disabled = false): string {
  if (disabled) {
    return "left-[2px] bg-[color:rgba(255,255,255,0.88)]";
  }

  return active
    ? "left-[17px] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,231,214,0.92))]"
    : "left-[2px] bg-[color:#fff9f4]";
}

function ComposerModeToggle({
  active,
  caption,
  description,
  disabled = false,
  label,
  onClick,
}: Readonly<{
  active: boolean;
  caption: string;
  description: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}>) {
  return (
    <div className="group relative overflow-visible">
      <button
        className={`inline-flex min-h-[40px] items-center gap-3 rounded-full border px-3 py-1.5 text-left transition ${composerModeTone(active, disabled)}`}
        disabled={disabled}
        onClick={onClick}
        role="switch"
        aria-checked={active}
        aria-label={`${label}: ${description}`}
        type="button"
      >
        <span className="min-w-0">
          <span className="block text-[11px] font-medium leading-4">{label}</span>
          <span className="block text-[8.5px] uppercase tracking-[0.16em] text-[color:rgba(67,58,49,0.48)]">
            {caption}
          </span>
        </span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border transition ${composerSwitchTrack(active, disabled)}`}
        >
          <span
            className={`absolute top-[2px] inline-flex size-4 rounded-full shadow-[0_8px_18px_rgba(18,14,10,0.18)] transition-all duration-300 ${composerSwitchThumb(active, disabled)}`}
          />
        </span>
      </button>

      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1.5 w-44 -translate-x-1/2 rounded-[12px] border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(41,28,36,0.98),rgba(18,12,18,0.96))] px-2.5 py-2 text-[10px] leading-4 text-[color:#f7f2ea] opacity-0 shadow-[0_14px_26px_rgba(16,14,11,0.2)] transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        {description}
      </span>
    </div>
  );
}

function presenceTitle(isSubmitting: boolean, activeSession: StoredChatSession | null): string {
  if (isSubmitting) {
    return "Analizando";
  }

  return "Orbbi";
}

function presenceDetail(
  isSubmitting: boolean,
  activeSession: StoredChatSession | null,
  llmReady: boolean,
): string {
  if (isSubmitting) {
    return "Cruza señal, cobertura y memoria antes de responder.";
  }

  if (activeSession?.turns.length) {
    const turnsLabel = `${activeSession.turns.length} mensajes en contexto`;
    const modeLabel = llmReady ? "narrativa disponible" : "solo datos";
    return `${turnsLabel}. ${modeLabel}.`;
  }

  return "Pregunte por una fecha, una caída o una tendencia.";
}

function presenceSubtitle(
  isSubmitting: boolean,
  backendHealth: BackendHealth | null,
  useLlm: boolean,
  allowHypotheses: boolean,
  allowWebResearch: boolean,
): string {
  const model =
    backendHealth?.llm.model ?? (backendHealth?.llm.ready ? "motor de lenguaje" : "motor de datos");

  if (isSubmitting) {
    return `${model} · razonando sobre el histórico`;
  }

  if (!backendHealth?.llm.ready || !useLlm) {
    return `${model} · datos`;
  }

  if (allowWebResearch) {
    return `${model} · datos + contexto web`;
  }

  if (allowHypotheses) {
    return `${model} · datos + hipótesis`;
  }

  return `${model} · redacción`;
}

function pendingResponseDetail(
  useLlm: boolean,
  allowHypotheses: boolean,
  allowWebResearch: boolean,
): string {
  if (useLlm && allowHypotheses && allowWebResearch) {
    return "Fija el dato y separa hipótesis y contexto externo.";
  }

  if (useLlm) {
    return "Ordena la evidencia y pule la salida.";
  }

  return "Prepara una respuesta basada en datos.";
}

export function ChatWorkspace({ initialQuestion }: ChatWorkspaceProps) {
  const [sessions, setSessions] = useState<StoredChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState(initialQuestion?.trim() || "");
  const [useLlm, setUseLlm] = useState(false);
  const [allowHypotheses, setAllowHypotheses] = useState(false);
  const [allowWebResearch, setAllowWebResearch] = useState(false);
  const [externalContext, setExternalContext] = useState("");
  const [backendHealth, setBackendHealth] = useState<BackendHealth | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [greetingFaceIndex, setGreetingFaceIndex] = useState(0);
  const [showInlineContext, setShowInlineContext] = useState(false);
  const autoPromptRan = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const llmToggleTouched = useRef(false);

  useEffect(() => {
    const stored = loadChatSessions();
    if (stored.length) {
      setSessions(stored);
      setActiveSessionId(stored[0].id);
      return;
    }

    const blank = createBlankSession();
    setSessions([blank]);
    setActiveSessionId(blank.id);
  }, []);

  useEffect(() => {
    let mounted = true;
    let controller = new AbortController();

    async function loadHealth() {
      try {
        const health = await getBackendHealth(controller.signal);
        if (!mounted) {
          return;
        }
        setBackendHealth(health);
        if (!llmToggleTouched.current) {
          setUseLlm(health.llm.ready);
        }
        if (!health.llm.ready) {
          setAllowHypotheses(false);
          setAllowWebResearch(false);
        }
      } catch {
        if (!controller.signal.aborted && mounted) {
          setBackendHealth(null);
          if (!llmToggleTouched.current) {
            setUseLlm(false);
          }
          setAllowHypotheses(false);
          setAllowWebResearch(false);
        }
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") {
        return;
      }
      controller.abort();
      controller = new AbortController();
      void loadHealth();
    }

    void loadHealth();
    const intervalId = globalThis.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      void loadHealth();
    }, 15000);
    globalThis.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      controller.abort();
      globalThis.clearInterval(intervalId);
      globalThis.removeEventListener("focus", handleVisibilityChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!sessions.length) {
      return;
    }

    saveChatSessions(sessions);
  }, [sessions]);

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0] ?? null;

  const latestAssistantPayload = activeSession
    ? activeSession.turns.findLast((turn) => turn.role === "assistant")?.payload ?? null
    : null;

  const llmReady = backendHealth?.llm.ready ?? false;
  const latestFollowUps = asArray(latestAssistantPayload?.follow_up_questions);
  const followUps = latestFollowUps.length ? latestFollowUps : starterPrompts;
  const notice = llmBannerCopy(backendHealth);
  const heroTitle = presenceTitle(isSubmitting, activeSession);
  const heroDetail = presenceDetail(isSubmitting, activeSession, llmReady);
  const heroSubtitle = presenceSubtitle(
    isSubmitting,
    backendHealth,
    useLlm,
    allowHypotheses,
    allowWebResearch,
  );
  const hasConversation = Boolean(activeSession?.turns.length);
  const hasDraft = draft.trim().length > 0;
  const headerTitle = hasConversation ? activeSession?.title ?? "Nuevo hilo" : heroTitle;
  const headerDetail = hasConversation
    ? heroDetail
    : "Un solo espacio para preguntar, comparar y fijar piezas en el tablero.";
  const displayHeaderTitle =
    headerTitle.length > 64 ? `${headerTitle.slice(0, 61).trimEnd()}…` : headerTitle;
  const welcomeTitle = greetingLabel();
  const showWelcomeHero = !hasConversation && !hasDraft && !isSubmitting;
  const showCompanionOrb = hasConversation || hasDraft || isSubmitting;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [activeSession?.turns.length]);

  useEffect(() => {
    if (!showWelcomeHero) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      setGreetingFaceIndex((current) => (current + 1) % greetingFaces.length);
    }, 1800);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [showWelcomeHero]);

  useEffect(() => {
    if (!initialQuestion || autoPromptRan.current || !activeSession) {
      return;
    }

    autoPromptRan.current = true;
    setDraft(initialQuestion);
    void sendQuestion(initialQuestion);
  }, [activeSession, initialQuestion]);

  function createNewChat() {
    const blank = createBlankSession();
    setSessions((current) => [blank, ...current]);
    setActiveSessionId(blank.id);
    setDraft("");
    setError(null);
    setStatusMessage(null);
  }

  function clearCurrentChat() {
    if (!activeSession) {
      return;
    }

    const timestamp = new Date().toISOString();
    setSessions(
      sortSessionsByRecent(
        sessions.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                title: "Nuevo hilo",
                updatedAt: timestamp,
                turns: [],
              }
            : session,
        ),
      ),
    );
    setDraft("");
    setError(null);
    setStatusMessage(null);
  }

  function deleteCurrentChat() {
    if (!activeSession) {
      return;
    }

    const remaining = sessions.filter((session) => session.id !== activeSession.id);
    if (remaining.length) {
      setSessions(remaining);
      setActiveSessionId(remaining[0].id);
    } else {
      const blank = createBlankSession();
      setSessions([blank]);
      setActiveSessionId(blank.id);
    }
    setDraft("");
    setError(null);
    setStatusMessage(null);
  }

  function clearAllChats() {
    const blank = createBlankSession();
    clearChatSessionsStorage();
    setSessions([blank]);
    setActiveSessionId(blank.id);
    setDraft("");
    setError(null);
    setStatusMessage(null);
  }

  function handleAllowHypothesesChange(value: boolean) {
    llmToggleTouched.current = true;
    setAllowHypotheses(value);
    if (value && !useLlm) {
      setUseLlm(true);
    }
    if (!value) {
      setAllowWebResearch(false);
    }
  }

  function handleAllowWebResearchChange(value: boolean) {
    llmToggleTouched.current = true;
    setAllowWebResearch(value);
    if (value && !useLlm) {
      setUseLlm(true);
    }
    if (value && !allowHypotheses) {
      setAllowHypotheses(true);
    }
  }

  function handleUseLlmChange(value: boolean) {
    llmToggleTouched.current = true;
    setUseLlm(value);
    if (!value) {
      setAllowHypotheses(false);
      setAllowWebResearch(false);
    }
  }

  async function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !activeSession) {
      return;
    }

    setError(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    const timestamp = new Date().toISOString();
    const userTurn = {
      id: crypto.randomUUID(),
      role: "user" as const,
      text: trimmed,
    };
    const shouldUseLlm = llmReady ? useLlm : false;
    const shouldAllowHypotheses = shouldUseLlm ? allowHypotheses : false;
    const shouldAllowWebResearch =
      shouldUseLlm && shouldAllowHypotheses ? allowWebResearch : false;

    setSessions((current) =>
      sortSessionsByRecent(
        current.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                title:
                  session.turns.length === 0 ? sessionTitleFromQuestion(trimmed) : session.title,
                updatedAt: timestamp,
                turns: [...session.turns, userTurn],
              }
            : session,
        ),
      ),
    );

    try {
      const payload = await queryChat({
        question: trimmed,
        conversation_id: activeSession.id,
        use_llm: shouldUseLlm,
        allow_hypotheses: shouldAllowHypotheses,
        allow_web_research: shouldAllowWebResearch,
        external_context: externalContext.trim() || undefined,
      });

      const assistantTurn = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        text: payload.answer,
        payload,
      };

      setSessions((current) =>
        sortSessionsByRecent(
          current.map((session) =>
            session.id === activeSession.id
              ? {
                  ...session,
                  updatedAt: new Date().toISOString(),
                  turns: [...session.turns, assistantTurn],
                }
              : session,
          ),
        ),
      );
      setDraft("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "El asistente no pudo conectarse con el backend.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function pinNote(payload: ChatQueryResponse, sourceQuestion: string) {
    pinArtifactWidget({
      artifact: null,
      answerExcerpt: payload.answer,
      sourceIntent: payload.intent,
      sourceQuestion,
      title: `${assistantEyebrow(payload)} · ${sourceQuestion.slice(0, 28)}`,
    });
    setStatusMessage(pinSuccessCopy("note"));
  }

  function pinArtifact(
    payload: ChatQueryResponse,
    artifactIndex: number,
    sourceQuestion: string,
  ) {
    const artifact = payload.artifacts[artifactIndex] ?? null;
    pinArtifactWidget({
      artifact,
      answerExcerpt: payload.answer,
      sourceIntent: payload.intent,
      sourceQuestion,
      title: artifact?.title,
    });
    setStatusMessage(pinSuccessCopy("artifact"));
  }

  function renderComposer({ centered = false }: Readonly<{ centered?: boolean }> = {}) {
    const sendDisabled = isSubmitting || !draft.trim() || !activeSession;
    const contextOpen = showInlineContext || externalContext.trim().length > 0;

    return (
      <div
        className={
          centered ? "mx-auto w-full max-w-[920px]" : "mx-auto w-full max-w-[1440px]"
        }
      >
        <div
          className={[
            "chat-composer-shell",
            centered
              ? [
                  "rounded-[26px] px-4 py-3.5 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  hasDraft
                    ? "translate-y-[-4px] shadow-[0_34px_74px_rgba(255,122,31,0.12),inset_0_1px_0_rgba(255,255,255,0.9)]"
                    : "",
                ].join(" ")
              : "mt-2 rounded-[24px] px-3.5 py-3 sm:px-4 sm:py-3.5",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Modos
            </span>
            <ComposerModeToggle
              active={useLlm && llmReady}
              caption="Pulir"
              description="Mejora la claridad, el tono y la presentación de la respuesta sin cambiar la base del dato."
              disabled={!llmReady}
              label="Redacción"
              onClick={() => handleUseLlmChange(!(useLlm && llmReady))}
            />
            <ComposerModeToggle
              active={allowHypotheses && llmReady}
              caption="Explorar"
              description="Propone posibles explicaciones tentativas, separadas de los hechos observados en el dataset."
              disabled={!llmReady}
              label="Hipótesis"
              onClick={() => handleAllowHypothesesChange(!(allowHypotheses && llmReady))}
            />
            <ComposerModeToggle
              active={allowWebResearch && llmReady}
              caption="Contrastar"
              description="Añade contexto externo para contrastar la lectura, pero no reemplaza ni confirma por sí solo el dato interno."
              disabled={!llmReady || !allowHypotheses}
              label="Web"
              onClick={() => handleAllowWebResearchChange(!(allowWebResearch && llmReady))}
            />
            <button
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${composerModeTone(contextOpen)}`}
              onClick={() => setShowInlineContext((current) => !current)}
              aria-label="Contexto: añade información conocida por su equipo, como promociones o incidentes, para orientar la respuesta."
              type="button"
            >
              Contexto
            </button>
          </div>

          {contextOpen ? (
            <div className="mt-2.5 rounded-[16px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.56)] px-3 py-2.5">
              <p className="text-[11px] text-[color:var(--text-soft)]">
                Añada promos, incidentes internos o señales externas conocidas por su equipo.
              </p>
              <textarea
                className="glass-scroll mt-2 min-h-14 w-full resize-none bg-transparent text-[12px] leading-5 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
                onChange={(event) => setExternalContext(event.target.value)}
                placeholder="Ej: Hubo una promo masiva o reportes internos de latencia."
                value={externalContext}
              />
            </div>
          ) : null}

          {notice ? (
            <div className="mt-2.5 rounded-[16px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-3 py-2 text-[12px] leading-5 text-[color:var(--signal-amber)]">
              {notice}
            </div>
          ) : null}

          <textarea
            className={[
              "glass-scroll mt-2.5 w-full resize-none overflow-y-auto bg-transparent text-[13px] text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]",
              centered
                ? "min-h-20 max-h-[144px] text-[14px] leading-6"
                : "min-h-[58px] max-h-[132px] leading-6",
            ].join(" ")}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (!sendDisabled) {
                  void sendQuestion(draft);
                }
              }
            }}
            placeholder="Pregunte por una fecha, una caída, una franja horaria o una comparación."
            value={draft}
          />

          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] text-[color:var(--text-dim)]">
              Enter para enviar · Shift + Enter para salto
            </p>

            <div className="flex items-center gap-2.5">
              {isSubmitting ? (
                <span className="copilot-pill rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]">
                  análisis activo
                </span>
              ) : null}
              <button
                className="copilot-gradient-button rounded-full px-4 py-2 text-sm font-medium text-[color:#fff7f3] transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={sendDisabled}
                onClick={() => void sendQuestion(draft)}
                type="button"
              >
                {isSubmitting ? "Analizando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>

        {centered ? (
          <div
            className={[
              "mt-4 flex flex-wrap justify-center gap-2 transition-all duration-500",
              showWelcomeHero ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          >
            {followUps.slice(0, 3).map((prompt) => (
              <button
                className="chat-kicker-chip rounded-full px-3.5 py-2 text-[11px] transition hover:text-[color:var(--text-strong)]"
                key={prompt}
                onClick={() => setDraft(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <main className="chat-page-shell min-h-[100dvh] overflow-hidden lg:h-dvh">
      <section className="relative z-10 grid h-full min-h-0 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="chat-sidebar-shell order-2 flex min-h-0 flex-col border-t border-[color:rgba(255,255,255,0.06)] lg:order-1 lg:h-full lg:border-r lg:border-t-0">
          <div className="flex items-center justify-between border-b border-[color:rgba(255,255,255,0.08)] px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(255,240,232,0.48)]">
                Orbbi
              </p>
              <p
                className="mt-2 text-[1.85rem] font-normal tracking-[-0.05em] text-white"
                style={{ fontFamily: "var(--font-brand), cursive" }}
              >
                Chat
              </p>
            </div>

            <DashboardStaggeredMenu items={chatMenuItems} />
          </div>

          <div className="border-b border-[color:rgba(255,255,255,0.06)] px-5 py-4">
            <button
              className="w-full rounded-[18px] border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,122,31,0.2))] px-4 py-3 text-left text-sm font-medium text-white shadow-[0_18px_40px_rgba(0,0,0,0.18)] transition hover:border-[color:rgba(255,255,255,0.14)]"
              onClick={createNewChat}
              type="button"
            >
              + Nuevo hilo
            </button>
          </div>

          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(255,240,232,0.48)]">
              Hilos
            </p>
            <span className="text-[11px] text-[color:rgba(255,240,232,0.48)]">
              {sessions.length}
            </span>
          </div>

          <div className="glass-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto px-3 pb-4">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;

              return (
                <button
                  className={[
                    "w-full rounded-[18px] border px-4 py-3 text-left transition",
                    isActive
                      ? "border-[color:rgba(255,122,31,0.22)] bg-[linear-gradient(135deg,rgba(255,122,31,0.2),rgba(255,255,255,0.04))] text-white shadow-[0_16px_34px_rgba(255,122,31,0.12)]"
                      : "border-[color:rgba(255,255,255,0.05)] bg-[color:rgba(255,255,255,0.02)] text-[color:rgba(255,240,232,0.76)] hover:border-[color:rgba(255,255,255,0.12)] hover:bg-[color:rgba(255,255,255,0.05)]",
                  ].join(" ")}
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{session.title}</p>
                    {isActive ? (
                      <span className="rounded-full bg-[color:rgba(255,255,255,0.08)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:#ffd7bf]">
                        activo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[color:rgba(255,240,232,0.56)]">
                    {session.turns.length ? `${session.turns.length} mensajes` : "Sin mensajes"}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[color:rgba(255,240,232,0.38)]">
                    {relativeTimeLabel(session.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="border-t border-[color:rgba(255,255,255,0.08)] px-5 py-4">
            <Link
              className="inline-flex rounded-full border border-[color:rgba(255,255,255,0.1)] bg-[color:rgba(255,255,255,0.06)] px-4 py-2 text-sm font-medium text-white transition hover:border-[color:rgba(255,255,255,0.16)]"
              href="/dashboard"
            >
              Abrir dashboard
            </Link>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-[color:rgba(255,255,255,0.08)] px-3 py-2 text-xs text-[color:rgba(255,240,232,0.64)] transition hover:border-[color:rgba(255,255,255,0.14)] hover:text-white"
                onClick={clearCurrentChat}
                type="button"
              >
                Limpiar hilo
              </button>
              <button
                className="rounded-full border border-[color:rgba(255,255,255,0.08)] px-3 py-2 text-xs text-[color:rgba(255,240,232,0.64)] transition hover:border-[color:rgba(255,255,255,0.14)] hover:text-white"
                onClick={deleteCurrentChat}
                type="button"
              >
                Eliminar
              </button>
              <button
                className="rounded-full border border-[color:rgba(178,76,89,0.24)] px-3 py-2 text-xs text-[color:#ffb6a7] transition hover:border-[color:rgba(178,76,89,0.4)]"
                onClick={clearAllChats}
                type="button"
              >
                Limpiar todo
              </button>
            </div>
          </div>
        </aside>

        <section className="chat-main-shell order-1 flex min-h-0 flex-col lg:order-2 lg:h-full">
          {showCompanionOrb ? (
            <div className="chat-companion-orb pointer-events-none absolute right-5 top-5 z-20 hidden sm:block">
              <LandingParticleField
                activeLabel={isSubmitting ? "PIENSA" : null}
                mode="copilot"
                pointerRepel={isSubmitting}
                repelForce={2.1}
                repelRadius={64}
                transparent
              />
            </div>
          ) : null}

          {hasConversation ? (
            <div className="border-b border-[color:rgba(67,57,47,0.08)] px-5 py-3 lg:px-7">
              <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-2">
                <div className="flex flex-col gap-2.5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="min-w-0">
                    <p className="eyebrow">Conversación</p>
                    <h1
                      className="mt-1.5 max-w-[24ch] text-[clamp(1.2rem,1.9vw,1.7rem)] font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
                      style={{ fontFamily: "var(--font-heading), serif" }}
                    >
                      {displayHeaderTitle}
                    </h1>
                    <p className="mt-1 max-w-4xl text-[12px] leading-5 text-[color:var(--text-soft)]">
                      {headerDetail}
                    </p>
                  </div>

                  <p className="text-[10px] uppercase tracking-[0.18em] text-[color:rgba(67,58,49,0.52)]">
                    {heroSubtitle}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-b border-[color:rgba(67,57,47,0.08)] px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">Orbbi</p>
                  <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                    Un espacio para preguntar por fechas, caídas y patrones horarios.
                  </p>
                </div>

                <Link
                  className="rounded-full border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.76)] px-4 py-2 text-sm font-medium text-[color:var(--text-strong)] transition hover:border-[color:rgba(255,122,31,0.18)]"
                  href="/dashboard"
                >
                  Abrir dashboard
                </Link>
              </div>
            </div>
          )}

          <div className="glass-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div
              className={
                hasConversation
                  ? "mx-auto w-full max-w-[1440px] space-y-5 px-5 py-5 sm:px-6 lg:px-7 xl:px-8"
                  : "mx-auto flex min-h-full w-full max-w-5xl items-center justify-center px-6 py-6"
              }
            >
              {hasConversation ? (
                activeSession.turns.map((turn, index) => {
                  const payload = turn.payload;
                  const evidenceHighlights = summarizeEvidence(payload);
                  const answerParagraphs = splitAnswer(turn.text);
                  const sourceQuestion =
                    activeSession.turns
                      .slice(0, index)
                      .findLast((item) => item.role === "user")?.text ?? activeSession.title;

                  return (
                    <article className="w-full" key={turn.id}>
                      {turn.role === "user" ? (
                        <div className="copilot-message-user ml-auto max-w-[min(86%,980px)] rounded-[24px] px-4 py-3.5">
                          <p className="text-[13px] leading-6 text-[color:#fff8f4]">
                            {turn.text}
                          </p>
                        </div>
                      ) : (
                        <div className="copilot-message-assistant w-full rounded-[28px] px-4 py-4 backdrop-blur sm:px-5 sm:py-5">
                          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:rgba(108,83,67,0.62)]">
                                {assistantEyebrow(payload)}
                              </p>
                              <p className="mt-1.5 text-[12px] text-[color:var(--copilot-text-soft)]">
                                {assistantSubline(payload)}
                              </p>
                            </div>

                            {payload ? (
                              <div className="flex flex-wrap gap-2 sm:justify-end">
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] ${coverageChip(payload.confidence)}`}
                                >
                                  {confidenceLabel(payload.confidence)}
                                </span>
                                <span className="copilot-soft-chip rounded-full px-2.5 py-1 text-[11px]">
                                  {modeLabel(payload.answer_mode)}
                                </span>
                                <button
                                  className="copilot-outline-button rounded-full px-2.5 py-1 text-[11px] text-[color:#8a4d67] transition"
                                  onClick={() => pinNote(payload, sourceQuestion)}
                                  type="button"
                                >
                                  Fijar en tablero
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 space-y-3">
                            {answerParagraphs.map((paragraph, paragraphIndex) => (
                              <p
                                className="text-[13px] leading-6 text-[color:var(--copilot-text)]"
                                key={`${turn.id}-paragraph-${paragraphIndex}`}
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>

                          {evidenceHighlights.length ? (
                            <div className="mt-4 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                              {evidenceHighlights.map((item) => (
                                <div
                                  className="rounded-[18px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.58)] p-2.5"
                                  key={`${item.label}-${item.value}`}
                                >
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(108,83,67,0.54)]">
                                    {item.label}
                                  </p>
                                  <p className="mt-1.5 text-[13px] font-medium leading-5 text-[color:var(--copilot-text)]">
                                    {item.value}
                                  </p>
                                  <p className="mt-1 text-[10px] text-[color:var(--copilot-text-soft)]">
                                    {sourceLabel(item.source)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {asArray(payload?.artifacts).map((artifact, artifactIndex) => (
                            <div key={`${artifact.kind}-${artifactIndex}-${artifact.title}`}>
                              <div className="mt-4 flex justify-end">
                                <button
                                  className="copilot-outline-button rounded-full px-2.5 py-1.5 text-[11px] text-[color:#8a4d67] transition"
                                  onClick={() => payload && pinArtifact(payload, artifactIndex, sourceQuestion)}
                                  type="button"
                                >
                                  Fijar en tablero
                                </button>
                              </div>
                              <ChatArtifactView artifact={artifact} />
                            </div>
                          ))}

                          {payload?.warnings.length ? (
                            <div
                              className={[
                                "mt-4 rounded-[18px] px-3.5 py-2.5 text-[13px] leading-6",
                                payload.answer_mode === "deterministic_fallback"
                                  ? "border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(255,206,115,0.14)] text-[color:#7c5117]"
                                  : "border border-[color:rgba(166,63,116,0.18)] bg-[color:rgba(234,77,161,0.1)] text-[color:#7f3156]",
                              ].join(" ")}
                            >
                              <p className="text-[13px] font-medium">
                                {payload.answer_mode === "deterministic_fallback"
                                  ? "Sigue en datos"
                                  : "Use con cautela"}
                              </p>
                              <div className="mt-2 space-y-2">
                                {asArray(payload.warnings).map((item) => (
                                  <p key={item}>{item}</p>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {payload?.hypotheses.length ? (
                            <div className="mt-4 rounded-[18px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(255,206,115,0.14)] px-3.5 py-2.5 text-[13px] leading-6 text-[color:#7c5117]">
                              <p className="text-[13px] font-medium">Hipótesis</p>
                              <div className="mt-2 space-y-2">
                                {asArray(payload.hypotheses).map((item) => (
                                  <p key={item}>{item}</p>
                                ))}
                              </div>
                              {payload.web_research_used && asArray(payload.web_sources).length ? (
                                <div className="mt-4 border-t border-[color:rgba(176,108,31,0.18)] pt-3">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(124,81,23,0.7)]">
                                    Fuentes externas
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {asArray(payload.web_sources).slice(0, 4).map((source) => (
                                      <a
                                        className="block text-[13px] underline decoration-[color:rgba(176,108,31,0.34)] underline-offset-4 hover:text-[color:#5f3b12]"
                                        href={source.url}
                                        key={source.url}
                                        rel="noreferrer"
                                        target="_blank"
                                      >
                                        {source.title || source.domain}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {payload?.follow_up_questions.length ? (
                            <div className="mt-4">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:rgba(108,83,67,0.54)]">
                                Siguiente paso
                              </p>
                              <div className="mt-2.5 flex flex-wrap gap-2">
                                {asArray(payload.follow_up_questions).slice(0, 3).map((prompt) => (
                                  <button
                                    className="copilot-soft-chip rounded-full px-3 py-1.5 text-[11px] transition hover:border-[color:rgba(255,255,255,0.16)] hover:text-[color:#fff7f2]"
                                    key={prompt}
                                    onClick={() => setDraft(prompt)}
                                    type="button"
                                  >
                                    {prompt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {payload ? (
                            <details className="mt-4 rounded-[20px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.58)] px-3.5 py-2.5">
                              <summary className="cursor-pointer list-none text-[13px] font-medium text-[color:var(--copilot-text)]">
                                Detrás de esta respuesta
                              </summary>

                              <div className="mt-3.5 space-y-3.5 text-[13px] text-[color:var(--copilot-text-soft)]">
                                {asArray(payload.analysis_steps).length ? (
                                  <div className="rounded-[16px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.46)] px-3.5 py-2.5">
                                    <p className="text-[13px] font-medium text-[color:var(--copilot-text)]">
                                      Qué revisó el asistente
                                    </p>
                                    <div className="mt-2.5 space-y-1.5 text-[13px] leading-6">
                                      {asArray(payload.analysis_steps).map((item) => (
                                        <div className="flex gap-3" key={item}>
                                          <span className="pt-[2px] text-[color:rgba(108,83,67,0.52)]">
                                            •
                                          </span>
                                          <span>{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="grid gap-2.5 sm:grid-cols-2">
                                  {asArray(payload.evidence).map((item) => (
                                    <div
                                      className="rounded-[16px] border border-[color:rgba(67,57,47,0.08)] bg-[color:rgba(255,255,255,0.46)] px-3.5 py-2.5"
                                      key={`${item.label}-${item.value}-detail`}
                                    >
                                      <p className="text-[13px] font-medium text-[color:var(--copilot-text)]">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 leading-6">{item.value}</p>
                                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[color:rgba(108,83,67,0.54)]">
                                        {sourceLabel(item.source)}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {asArray(payload.source_tables).map((item) => (
                                    <span
                                      className="copilot-soft-chip rounded-full px-3 py-1 text-xs"
                                      key={item}
                                    >
                                      {sourceLabel(item)}
                                    </span>
                                  ))}
                                </div>

                                <p className="text-xs leading-6 text-[color:rgba(108,83,67,0.6)]">
                                  {payload.reasoning_scope}
                                </p>

                                <p className="text-xs leading-6 text-[color:rgba(108,83,67,0.6)]">
                                  {payload.disclaimer}
                                </p>
                              </div>
                            </details>
                          ) : null}
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="chat-empty-stage flex w-full items-center justify-center">
                  <div className="relative mx-auto flex w-full max-w-[1040px] -translate-y-6 flex-col items-center text-center xl:-translate-y-8">
                    <div
                      className={[
                        "chat-particle-orb transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        showWelcomeHero
                          ? "opacity-100 scale-100"
                          : "pointer-events-none opacity-0 scale-75 -translate-y-8",
                      ].join(" ")}
                    >
                      <LandingParticleField
                        activeLabel={null}
                        mode="copilot"
                        pointerRepel={false}
                        transparent
                      />
                    </div>

                    <div
                      className={[
                        "w-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                        showWelcomeHero ? "mt-4 opacity-100" : "mt-0 opacity-100",
                      ].join(" ")}
                    >
                      <div
                        className={[
                          "transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
                          showWelcomeHero
                            ? "max-h-[16rem] opacity-100 translate-y-0"
                            : "pointer-events-none max-h-0 overflow-hidden opacity-0 -translate-y-6",
                        ].join(" ")}
                      >
                        <div className="relative mx-auto min-h-[5.6rem] min-w-[15ch] overflow-visible py-2">
                          {greetingFaces.map((face, index) => (
                            <span
                              className={[
                                "absolute inset-0 flex items-center justify-center whitespace-nowrap text-[clamp(2.5rem,5vw,4.2rem)] font-normal leading-[1.08] tracking-[-0.06em] transition-all duration-700",
                                face.tone,
                                index === greetingFaceIndex
                                  ? "translate-y-0 scale-100 opacity-100"
                                  : "translate-y-5 scale-[0.96] opacity-0",
                              ].join(" ")}
                              key={face.fontFamily}
                              style={{ fontFamily: face.fontFamily }}
                            >
                              {welcomeTitle}
                            </span>
                          ))}
                        </div>
                        <h2
                          className="mt-1 text-[clamp(1.9rem,4vw,3rem)] font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
                          style={{ fontFamily: "var(--font-heading), serif" }}
                        >
                          ¿Qué quiere revisar?
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[color:var(--chat-soft-ink)]">
                          Cobertura, anomalías, horas críticas y comparaciones con respaldo.
                        </p>
                      </div>

                      <div className={showWelcomeHero ? "mt-7 w-full" : "mt-0 w-full"}>
                        {renderComposer({ centered: true })}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {isSubmitting ? (
                <div className="mx-auto w-full max-w-[1440px]">
                  <ChatThinkingCore
                    active
                    compact
                    detail={pendingResponseDetail(useLlm && llmReady, allowHypotheses, allowWebResearch)}
                    label="Respuesta en curso"
                    subtitle={heroSubtitle}
                    title="Analizando"
                  />
                </div>
              ) : null}

              {statusMessage ? (
                <div className="rounded-[22px] border border-[color:rgba(21,125,120,0.18)] bg-[color:rgba(21,125,120,0.08)] px-4 py-3 text-sm text-[color:var(--signal-cyan)]">
                  {statusMessage}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-[22px] border border-[color:rgba(178,76,89,0.22)] bg-[color:rgba(178,76,89,0.08)] px-4 py-3 text-sm text-[color:var(--signal-rose)]">
                  {error}
                </div>
              ) : null}

              <div ref={endRef} />
            </div>
          </div>

          {hasConversation ? (
            <div className="border-t border-[color:rgba(67,57,47,0.08)] px-4 py-3 sm:px-6 lg:px-7">
              <div className="mx-auto w-full max-w-[1440px]">{renderComposer()}</div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
