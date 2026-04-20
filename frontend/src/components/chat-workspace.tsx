"use client";

import { useEffect, useRef, useState } from "react";

import { ChatArtifactView } from "@/components/chat-artifact";
import { ChatSettingsPanel } from "@/components/chat-settings-panel";
import type { BackendHealth, ChatQueryResponse } from "@/lib/api";
import { getBackendHealth, queryChat } from "@/lib/api";
import {
  DASHBOARD_WIDGETS_EVENT,
  loadPinnedWidgets,
  pinArtifactWidget,
} from "@/lib/dashboard-store";
import {
  clearChatSessionsStorage,
  createBlankSession,
  loadChatSessions,
  saveChatSessions,
  sessionTitleFromQuestion,
  type StoredChatSession,
} from "@/lib/chat-store";
import { coverageChip, modeLabel, sourceLabel } from "@/lib/format";

type ChatWorkspaceProps = {
  initialQuestion?: string | null;
};

const starterPrompts = [
  "¿Qué pasó el 2026-02-10?",
  "Muéstreme los días con menor cobertura.",
  "Compare entre semana contra fines de semana.",
  "¿Cuál fue la hora con menor cobertura el 11 de febrero?",
];

function relativeTimeLabel(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("es", {
    month: "short",
    day: "numeric",
  }).format(date);
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

  return "El motor activo está en modo solo grounded. Si ya cambió .env, reinicie el backend para habilitar redacción enriquecida.";
}

function summarizeEvidence(payload: ChatQueryResponse | undefined) {
  return asArray(payload?.evidence).slice(0, 3);
}

function assistantEyebrow(payload: ChatQueryResponse | undefined): string {
  if (!payload) {
    return "Respuesta grounded";
  }

  const mapping: Record<string, string> = {
    day_briefing: "Brief del día",
    daily_coverage_profile: "Cobertura diaria",
    hourly_coverage_profile: "Cobertura horaria",
    hourly_coverage_lookup: "Consulta horaria",
    weekday_weekend_comparison: "Entre semana vs fin de semana",
    weekend_coverage_report: "Reporte de fin de semana",
    coverage_extremes: "Resumen de cobertura",
    data_quality_status: "Calidad del dato",
    anomaly_review: "Revisión de anomalías",
    intraday_pattern: "Patrón intradía",
    metric_definition: "Definición métrica",
    unsupported_request: "Límite del dataset",
  };

  return mapping[payload.intent] ?? "Respuesta grounded";
}

function assistantSubline(payload: ChatQueryResponse | undefined): string {
  if (!payload?.time_window) {
    return "Construido desde analítica procesada y evidencia adjunta.";
  }

  const start = payload.time_window.effective_start;
  const end = payload.time_window.effective_end;
  const scope = start === end ? start : `${start} -> ${end}`;

  if (payload.answer_mode === "llm_enhanced") {
    if (payload.web_research_used) {
      return `Grounded sobre ${scope}, luego enriquecido con redacción y contexto externo tentativo.`;
    }
    return `Grounded sobre ${scope}, luego refinado con redacción enriquecida.`;
  }

  if (payload.answer_mode === "deterministic_fallback") {
    return `Grounded sobre ${scope}. Se pidió enriquecimiento, pero la respuesta quedó determinística.`;
  }

  return `Grounded sobre ${scope} con analítica determinística.`;
}

function pinSuccessCopy(kind: "artifact" | "note"): string {
  return kind === "artifact"
    ? "Widget fijado en el canvas del dashboard."
    : "Insight fijado en el canvas del dashboard.";
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
  const [pinnedCount, setPinnedCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
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
    setPinnedCount(loadPinnedWidgets().length);

    function syncPinnedCount() {
      setPinnedCount(loadPinnedWidgets().length);
    }

    window.addEventListener(DASHBOARD_WIDGETS_EVENT, syncPinnedCount);
    window.addEventListener("storage", syncPinnedCount);

    return () => {
      window.removeEventListener(DASHBOARD_WIDGETS_EVENT, syncPinnedCount);
      window.removeEventListener("storage", syncPinnedCount);
    };
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
    const intervalId = window.setInterval(() => {
      controller.abort();
      controller = new AbortController();
      void loadHealth();
    }, 15000);
    window.addEventListener("focus", handleVisibilityChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mounted = false;
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleVisibilityChange);
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
    ? activeSession.turns
        .filter((turn) => turn.role === "assistant")
        .at(-1)?.payload ?? null
    : null;

  const llmReady = backendHealth?.llm.ready ?? false;
  const latestFollowUps = asArray(latestAssistantPayload?.follow_up_questions);
  const followUps = latestFollowUps.length ? latestFollowUps : starterPrompts;
  const notice = llmBannerCopy(backendHealth);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [activeSession?.turns.length]);

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
    setPinnedCount(loadPinnedWidgets().length);
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
    setPinnedCount(loadPinnedWidgets().length);
    setStatusMessage(pinSuccessCopy("artifact"));
  }

  return (
    <main className="mx-auto max-w-[1480px] px-4 pb-20 pt-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="panel flex min-h-[760px] flex-col rounded-[34px] p-4">
          <div className="border-b border-[color:var(--border)] px-2 pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Hilos</p>
                <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                  Hilos guardados localmente y listos para reabrir.
                </p>
              </div>
              <button
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-sm text-[color:var(--text-strong)] transition hover:border-[color:var(--border-strong)]"
                onClick={createNewChat}
                type="button"
              >
                Nuevo
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                onClick={clearCurrentChat}
                type="button"
              >
                Limpiar hilo
              </button>
              <button
                className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                onClick={deleteCurrentChat}
                type="button"
              >
                Eliminar hilo
              </button>
              <button
                className="rounded-full border border-[color:rgba(178,76,89,0.18)] px-3 py-2 text-xs text-[color:var(--signal-rose)] transition hover:border-[color:rgba(178,76,89,0.32)]"
                onClick={clearAllChats}
                type="button"
              >
                Limpiar todo
              </button>
            </div>
          </div>

          <div className="glass-scroll mt-4 flex-1 space-y-2 overflow-y-auto pr-1">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;

              return (
                <button
                  className={[
                    "w-full rounded-[24px] border px-4 py-3 text-left transition",
                    isActive
                      ? "border-[color:rgba(21,125,120,0.24)] bg-[color:rgba(21,125,120,0.08)]"
                      : "border-[color:var(--border)] bg-[color:var(--surface-strong)] hover:border-[color:var(--border-strong)]",
                  ].join(" ")}
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-[color:var(--text-strong)]">
                      {session.title}
                    </p>
                    {isActive ? (
                      <span className="rounded-full bg-[color:rgba(21,125,120,0.12)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--signal-cyan)]">
                        activo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-[color:var(--text-soft)]">
                    {session.turns.length ? `${session.turns.length} mensajes` : "Sin mensajes"}
                  </p>
                  <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                    {relativeTimeLabel(session.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="panel flex min-h-[760px] flex-col rounded-[34px]">
          <div className="border-b border-[color:var(--border)] px-6 py-5">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow">Copiloto analítico</span>
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
                  {llmReady ? "redacción lista" : "solo grounded"}
                </span>
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
                  {pinnedCount} widgets fijados
                </span>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div>
                  <h1
                    className="text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
                    style={{ fontFamily: "var(--font-heading), serif" }}
                  >
                    Pregunte, pruebe un modo de respuesta y lleve piezas al canvas.
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--text-soft)]">
                    La conversación mantiene la evidencia pegada a cada respuesta. Si algo sirve, puede fijarlo en el dashboard como widget.
                  </p>
                </div>

                <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.74)] p-4">
                  <p className="text-sm font-medium text-[color:var(--text-strong)]">
                    Hilo activo
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]">
                    {activeSession?.title ?? "Nuevo hilo"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--text-soft)]">
                    {activeSession?.turns.length
                      ? `${activeSession.turns.length} mensajes guardados en este navegador.`
                      : "Empiece con un brief de día, una comparación o un gráfico."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-scroll flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-3xl space-y-8">
              {activeSession?.turns.length ? (
                activeSession.turns.map((turn, index) => {
                  const payload = turn.payload;
                  const evidenceHighlights = summarizeEvidence(payload);
                  const answerParagraphs = splitAnswer(turn.text);
                  const sourceQuestion =
                    activeSession.turns
                      .slice(0, index)
                      .reverse()
                      .find((item) => item.role === "user")?.text ?? activeSession.title;

                  return (
                    <article key={turn.id}>
                      {turn.role === "user" ? (
                        <div className="ml-auto max-w-[78%] rounded-[28px] border border-[color:rgba(21,125,120,0.18)] bg-[linear-gradient(135deg,rgba(21,125,120,0.12),rgba(255,255,255,0.86))] px-5 py-4 shadow-[var(--shadow-soft)]">
                          <p className="text-sm leading-7 text-[color:var(--text-strong)]">
                            {turn.text}
                          </p>
                        </div>
                      ) : (
                        <div className="max-w-[94%] rounded-[30px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.82)] px-5 py-5 shadow-[var(--shadow-soft)] backdrop-blur">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="eyebrow">{assistantEyebrow(payload)}</p>
                              <p className="mt-2 text-sm text-[color:var(--text-soft)]">
                                {assistantSubline(payload)}
                              </p>
                            </div>

                            {payload ? (
                              <div className="flex flex-wrap gap-2">
                                <span
                                  className={`rounded-full border px-3 py-1 text-xs ${coverageChip(payload.confidence)}`}
                                >
                                  {payload.confidence}
                                </span>
                                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)]">
                                  {modeLabel(payload.answer_mode)}
                                </span>
                                <button
                                  className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                                  onClick={() => pinNote(payload, sourceQuestion)}
                                  type="button"
                                >
                                  Fijar insight
                                </button>
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-5 space-y-4">
                            {answerParagraphs.map((paragraph, paragraphIndex) => (
                              <p
                                className="text-[15px] leading-8 text-[color:var(--text-strong)]"
                                key={`${turn.id}-paragraph-${paragraphIndex}`}
                              >
                                {paragraph}
                              </p>
                            ))}
                          </div>

                          {evidenceHighlights.length ? (
                            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                              {evidenceHighlights.map((item) => (
                                <div
                                  className="rounded-[20px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-3"
                                  key={`${item.label}-${item.value}`}
                                >
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                                    {item.label}
                                  </p>
                                  <p className="mt-2 text-sm font-medium leading-6 text-[color:var(--text-strong)]">
                                    {item.value}
                                  </p>
                                  <p className="mt-1 text-[11px] text-[color:var(--text-soft)]">
                                    {sourceLabel(item.source)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {asArray(payload?.artifacts).map((artifact, artifactIndex) => (
                            <div key={`${artifact.kind}-${artifactIndex}-${artifact.title}`}>
                              <div className="mt-5 flex justify-end">
                                <button
                                  className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                                  onClick={() => payload && pinArtifact(payload, artifactIndex, sourceQuestion)}
                                  type="button"
                                >
                                  Fijar widget
                                </button>
                              </div>
                              <ChatArtifactView artifact={artifact} />
                            </div>
                          ))}

                          {payload?.warnings.length ? (
                            <div
                              className={[
                                "mt-5 rounded-[20px] px-4 py-3 text-sm leading-6",
                                payload.answer_mode === "deterministic_fallback"
                                  ? "border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] text-[color:var(--signal-amber)]"
                                  : "border border-[color:rgba(178,76,89,0.18)] bg-[color:rgba(178,76,89,0.08)] text-[color:var(--signal-rose)]",
                              ].join(" ")}
                            >
                              <p className="text-sm font-medium">
                                {payload.answer_mode === "deterministic_fallback"
                                  ? "Sigue grounded"
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
                            <div className="mt-5 rounded-[20px] border border-[color:rgba(176,108,31,0.18)] bg-[color:rgba(176,108,31,0.08)] px-4 py-3 text-sm leading-6 text-[color:var(--signal-amber)]">
                              <p className="text-sm font-medium">Hipótesis tentativas</p>
                              <div className="mt-2 space-y-2">
                                {asArray(payload.hypotheses).map((item) => (
                                  <p key={item}>{item}</p>
                                ))}
                              </div>
                              {payload.web_research_used && asArray(payload.web_sources).length ? (
                                <div className="mt-4 border-t border-[color:rgba(176,108,31,0.18)] pt-3">
                                  <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                                    Fuentes externas
                                  </p>
                                  <div className="mt-2 space-y-2">
                                    {asArray(payload.web_sources).slice(0, 4).map((source) => (
                                      <a
                                        className="block text-sm underline decoration-[color:rgba(176,108,31,0.32)] underline-offset-4 hover:text-[color:var(--text-strong)]"
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
                            <div className="mt-5">
                              <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                                Siguiente paso
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {asArray(payload.follow_up_questions).slice(0, 3).map((prompt) => (
                                  <button
                                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
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
                            <details className="mt-5 rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3">
                              <summary className="cursor-pointer list-none text-sm font-medium text-[color:var(--text-strong)]">
                                Detrás de esta respuesta
                              </summary>

                              <div className="mt-4 space-y-4 text-sm text-[color:var(--text-soft)]">
                                {asArray(payload.analysis_steps).length ? (
                                  <div className="rounded-[18px] border border-[color:var(--border)] bg-[color:rgba(32,27,23,0.03)] px-4 py-3">
                                    <p className="text-sm font-medium text-[color:var(--text-strong)]">
                                      Qué revisó el asistente
                                    </p>
                                    <div className="mt-3 space-y-2 text-sm leading-6">
                                      {asArray(payload.analysis_steps).map((item) => (
                                        <div className="flex gap-3" key={item}>
                                          <span className="pt-[2px] text-[color:var(--text-dim)]">
                                            •
                                          </span>
                                          <span>{item}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                <div className="grid gap-3 sm:grid-cols-2">
                                  {asArray(payload.evidence).map((item) => (
                                    <div
                                      className="rounded-[18px] border border-[color:var(--border)] bg-[color:rgba(32,27,23,0.03)] px-4 py-3"
                                      key={`${item.label}-${item.value}-detail`}
                                    >
                                      <p className="text-sm font-medium text-[color:var(--text-strong)]">
                                        {item.label}
                                      </p>
                                      <p className="mt-1 leading-6">{item.value}</p>
                                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
                                        {sourceLabel(item.source)}
                                      </p>
                                    </div>
                                  ))}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {asArray(payload.source_tables).map((item) => (
                                    <span
                                      className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs"
                                      key={item}
                                    >
                                      {sourceLabel(item)}
                                    </span>
                                  ))}
                                </div>

                                <p className="text-xs leading-6 text-[color:var(--text-dim)]">
                                  {payload.reasoning_scope}
                                </p>

                                <p className="text-xs leading-6 text-[color:var(--text-dim)]">
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
                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-5 py-5 text-sm leading-7 text-[color:var(--text-soft)]">
                  Empiece con un brief de día, una comparación o una petición de gráfico. Cada respuesta quedará con evidencia y podrá fijarla luego en el dashboard.
                </div>
              )}

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

          <div className="border-t border-[color:var(--border)] px-4 py-4 sm:px-6">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap gap-2">
                {followUps.slice(0, 4).map((prompt) => (
                  <button
                    className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
                    key={prompt}
                    onClick={() => setDraft(prompt)}
                    type="button"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-3 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 shadow-[var(--shadow-soft)]">
                <textarea
                  className="glass-scroll min-h-28 w-full resize-none bg-transparent text-sm leading-7 text-[color:var(--text-strong)] outline-none placeholder:text-[color:var(--text-dim)]"
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Pida un brief del día, una comparación o un gráfico."
                  value={draft}
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-[color:var(--text-dim)]">
                      Los hilos se guardan en este navegador hasta que los limpie.
                    </p>
                    <p className="text-xs text-[color:var(--text-dim)]">
                      {llmReady
                        ? "Puede dejar la respuesta 100% grounded o añadir redacción y contexto desde el panel lateral."
                        : "Esta sesión está respondiendo en modo solo grounded."}
                    </p>
                  </div>
                  <button
                    className="rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isSubmitting || !draft.trim() || !activeSession}
                    onClick={() => void sendQuestion(draft)}
                    type="button"
                  >
                    {isSubmitting ? "Pensando..." : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ChatSettingsPanel
          allowHypotheses={allowHypotheses}
          allowWebResearch={allowWebResearch}
          backendHealth={backendHealth}
          externalContext={externalContext}
          llmReady={llmReady}
          notice={notice}
          onAllowHypothesesChange={(value) => {
            llmToggleTouched.current = true;
            setAllowHypotheses(value);
            if (value && !useLlm) {
              setUseLlm(true);
            }
            if (!value) {
              setAllowWebResearch(false);
            }
          }}
          onAllowWebResearchChange={(value) => {
            llmToggleTouched.current = true;
            setAllowWebResearch(value);
            if (value && !useLlm) {
              setUseLlm(true);
            }
            if (value && !allowHypotheses) {
              setAllowHypotheses(true);
            }
          }}
          onExternalContextChange={setExternalContext}
          onUseLlmChange={(value) => {
            llmToggleTouched.current = true;
            setUseLlm(value);
            if (!value) {
              setAllowHypotheses(false);
              setAllowWebResearch(false);
            }
          }}
          pinnedCount={pinnedCount}
          useLlm={useLlm}
        />
      </section>
    </main>
  );
}
