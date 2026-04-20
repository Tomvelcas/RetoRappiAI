import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearChatSessionsStorage,
  createBlankSession,
  loadChatSessions,
  saveChatSessions,
  sessionTitleFromQuestion,
} from "@/lib/chat-store";
import {
  DASHBOARD_WIDGETS_EVENT,
  loadDashboardLayouts,
  loadPinnedWidgets,
  pinArtifactWidget,
  removePinnedWidget,
  saveDashboardLayouts,
} from "@/lib/dashboard-store";

type MockWindow = Window & {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
  };
  dispatchEvent: (event: Event) => boolean;
};

function createStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe("frontend stores", () => {
  let mockWindow: MockWindow;
  let dispatchEvent: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatchEvent = vi.fn(() => true);
    mockWindow = {
      localStorage: createStorage(),
      dispatchEvent,
    } as unknown as MockWindow;

    vi.stubGlobal("window", mockWindow);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("creates, saves, loads and clears chat sessions safely", () => {
    const blank = createBlankSession();

    expect(blank.title).toBe("New chat");
    expect(blank.turns).toEqual([]);
    expect(sessionTitleFromQuestion("   ¿Qué pasó con la disponibilidad del martes?   ")).toBe(
      "¿Qué pasó con la disponibilidad del martes?",
    );

    saveChatSessions([
      {
        ...blank,
        turns: [
          {
            id: "turn-1",
            role: "assistant",
            text: "Respuesta",
            payload: { answer: "ok" } as never,
          },
        ],
      },
    ]);

    expect(loadChatSessions()).toEqual([
      {
        ...blank,
        turns: [
          {
            id: "turn-1",
            role: "assistant",
            text: "Respuesta",
            payload: expect.objectContaining({
              answer: "ok",
              analysis_steps: [],
              artifacts: [],
              evidence: [],
              warnings: [],
              source_tables: [],
            }),
          },
        ],
      },
    ]);

    clearChatSessionsStorage();
    expect(loadChatSessions()).toEqual([]);
  });

  it("persists dashboard layouts and pinned widgets while dispatching updates", () => {
    saveDashboardLayouts({
      hero: { x: 0, y: 0, w: 6, h: 4, visible: true },
    });

    expect(loadDashboardLayouts()).toEqual({
      hero: { x: 0, y: 0, w: 6, h: 4, visible: true },
    });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: DASHBOARD_WIDGETS_EVENT }));

    const widget = pinArtifactWidget({
      artifact: null,
      sourceQuestion: "Muéstreme el pico de cobertura",
      sourceIntent: "coverage_extremes",
      answerExcerpt: "El pico estuvo el viernes.",
    });

    expect(widget).not.toBeNull();
    expect(loadPinnedWidgets()).toHaveLength(1);

    removePinnedWidget(widget!.id);
    expect(loadPinnedWidgets()).toEqual([]);
  });

  it("fails soft when local storage has malformed JSON", () => {
    mockWindow.localStorage.setItem("northline-chat-sessions", "{");
    mockWindow.localStorage.setItem("dashboard-canvas-layouts", "{");
    mockWindow.localStorage.setItem("dashboard-canvas-pinned-widgets", "{");

    expect(loadChatSessions()).toEqual([]);
    expect(loadDashboardLayouts()).toEqual({});
    expect(loadPinnedWidgets()).toEqual([]);
  });
});
