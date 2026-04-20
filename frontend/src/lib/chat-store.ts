import type { ChatQueryResponse } from "@/lib/api";

export type StoredChatTurn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  payload?: ChatQueryResponse;
};

export type StoredChatSession = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  turns: StoredChatTurn[];
};

const STORAGE_KEY = "northline-chat-sessions";

function normalizeChatPayload(
  payload: ChatQueryResponse | Record<string, unknown> | undefined,
): ChatQueryResponse | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  return {
    ...(payload as ChatQueryResponse),
    analysis_steps: Array.isArray(payload.analysis_steps) ? payload.analysis_steps : [],
    evidence: Array.isArray(payload.evidence) ? payload.evidence : [],
    artifacts: Array.isArray(payload.artifacts) ? payload.artifacts : [],
    web_research_used: Boolean(payload.web_research_used),
    hypotheses: Array.isArray(payload.hypotheses) ? payload.hypotheses : [],
    web_sources: Array.isArray(payload.web_sources) ? payload.web_sources : [],
    follow_up_questions: Array.isArray(payload.follow_up_questions)
      ? payload.follow_up_questions
      : [],
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
    source_tables: Array.isArray(payload.source_tables) ? payload.source_tables : [],
  };
}

function normalizeChatSessions(
  sessions: StoredChatSession[] | Record<string, unknown>[],
): StoredChatSession[] {
  return sessions.map((session) => ({
    ...(session as StoredChatSession),
    turns: Array.isArray((session as StoredChatSession).turns)
      ? (session as StoredChatSession).turns.map((turn) => ({
          ...turn,
          payload: normalizeChatPayload(turn.payload),
        }))
      : [],
  }));
}

export function createBlankSession(): StoredChatSession {
  const timestamp = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    createdAt: timestamp,
    updatedAt: timestamp,
    turns: [],
  };
}

export function sessionTitleFromQuestion(question: string): string {
  return question.trim().replaceAll(/\s+/g, " ").slice(0, 48) || "New chat";
}

export function loadChatSessions(): StoredChatSession[] {
  if (typeof globalThis.window === "undefined") {
    return [];
  }

  const raw = globalThis.window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as StoredChatSession[];
    return Array.isArray(parsed) ? normalizeChatSessions(parsed) : [];
  } catch {
    return [];
  }
}

export function saveChatSessions(sessions: StoredChatSession[]) {
  if (typeof globalThis.window === "undefined") {
    return;
  }

  globalThis.window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 20)));
}

export function clearChatSessionsStorage() {
  if (typeof globalThis.window === "undefined") {
    return;
  }

  globalThis.window.localStorage.removeItem(STORAGE_KEY);
}
