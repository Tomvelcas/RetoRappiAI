import type { ChatArtifact } from "@/lib/api";

export type DashboardWidgetLayout = {
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
};

export type DashboardWidgetLayouts = Record<string, DashboardWidgetLayout>;

export type DashboardPinnedWidget = {
  id: string;
  title: string;
  sourceQuestion: string;
  sourceIntent: string;
  createdAt: string;
  artifact: ChatArtifact | null;
  answerExcerpt: string;
};

const DASHBOARD_LAYOUTS_KEY = "dashboard-canvas-layouts";
const DASHBOARD_PINNED_WIDGETS_KEY = "dashboard-canvas-pinned-widgets";
export const DASHBOARD_WIDGETS_EVENT = "dashboard-canvas-updated";

function dispatchDashboardUpdate() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(DASHBOARD_WIDGETS_EVENT));
}

export function loadDashboardLayouts(): DashboardWidgetLayouts {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(DASHBOARD_LAYOUTS_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as DashboardWidgetLayouts;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

export function saveDashboardLayouts(layouts: DashboardWidgetLayouts) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DASHBOARD_LAYOUTS_KEY, JSON.stringify(layouts));
  dispatchDashboardUpdate();
}

export function loadPinnedWidgets(): DashboardPinnedWidget[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DASHBOARD_PINNED_WIDGETS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as DashboardPinnedWidget[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePinnedWidgets(widgets: DashboardPinnedWidget[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    DASHBOARD_PINNED_WIDGETS_KEY,
    JSON.stringify(widgets.slice(0, 24)),
  );
  dispatchDashboardUpdate();
}

export function pinArtifactWidget(input: {
  artifact: ChatArtifact | null;
  sourceQuestion: string;
  sourceIntent: string;
  answerExcerpt: string;
  title?: string;
}): DashboardPinnedWidget | null {
  if (typeof window === "undefined") {
    return null;
  }

  const title =
    input.title?.trim() ||
    input.artifact?.title?.trim() ||
    input.sourceQuestion.trim().slice(0, 56) ||
    "Widget fijado";

  const widget: DashboardPinnedWidget = {
    id: `pinned-${crypto.randomUUID()}`,
    title,
    sourceQuestion: input.sourceQuestion.trim(),
    sourceIntent: input.sourceIntent,
    createdAt: new Date().toISOString(),
    artifact: input.artifact,
    answerExcerpt: input.answerExcerpt.trim().slice(0, 280),
  };

  const current = loadPinnedWidgets();
  savePinnedWidgets([widget, ...current]);
  return widget;
}

export function removePinnedWidget(widgetId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const remaining = loadPinnedWidgets().filter((widget) => widget.id !== widgetId);
  savePinnedWidgets(remaining);
}
