"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { DashboardWidgetLayout, DashboardWidgetLayouts } from "@/lib/dashboard-store";

type DashboardCanvasItem = {
  id: string;
  title: string;
  accent?: "cyan" | "amber" | "rose" | "default";
  minW?: number;
  minH?: number;
};

export type DashboardCardSize = "small" | "medium" | "large" | "hero";

export type DashboardCanvasRenderMeta = Readonly<{
  height: number;
  isCompact: boolean;
  size: DashboardCardSize;
  width: number;
}>;

type DashboardCanvasProps = Readonly<{
  className?: string;
  items: DashboardCanvasItem[];
  layouts: DashboardWidgetLayouts;
  onLayoutsChange: (layouts: DashboardWidgetLayouts) => void;
  renderItem: (id: string, meta: DashboardCanvasRenderMeta) => React.ReactNode;
}>;

type InteractionState = {
  id: string;
  mode: "pending-drag" | "drag" | "resize";
  startX: number;
  startY: number;
  startLayout: DashboardWidgetLayout;
};

const LOGICAL_COLUMNS = 12;
const TABLET_COLUMNS = 6;
const MOBILE_COLUMNS = 1;
const GRID_GAP = 16;
const MIN_CANVAS_ROWS = 10;
const MAX_CANVAS_ROWS = 40;
const DRAG_THRESHOLD = 6;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getColumnCount(width: number) {
  if (width < 640) {
    return MOBILE_COLUMNS;
  }

  if (width < 1080) {
    return TABLET_COLUMNS;
  }

  return LOGICAL_COLUMNS;
}

function scaledMinWidth(minWidth: number, columns: number) {
  if (columns === LOGICAL_COLUMNS) {
    return minWidth;
  }

  if (columns === MOBILE_COLUMNS) {
    return 1;
  }

  return clamp(Math.round((minWidth * columns) / LOGICAL_COLUMNS), 1, columns);
}

function collides(left: DashboardWidgetLayout, right: DashboardWidgetLayout) {
  return !(
    left.x + left.w <= right.x ||
    right.x + right.w <= left.x ||
    left.y + left.h <= right.y ||
    right.y + right.h <= left.y
  );
}

function normalizeLayout(
  layout: DashboardWidgetLayout,
  minW = 2,
  minH = 2,
  columns = LOGICAL_COLUMNS,
): DashboardWidgetLayout {
  const safeW = clamp(Math.round(layout.w), minW, columns);
  const safeH = clamp(Math.round(layout.h), minH, MAX_CANVAS_ROWS);

  return {
    x: clamp(Math.round(layout.x), 0, columns - safeW),
    y: clamp(Math.round(layout.y), 0, MAX_CANVAS_ROWS - safeH),
    w: safeW,
    h: safeH,
    visible: layout.visible,
  };
}

function findNextSlot(
  layout: DashboardWidgetLayout,
  placed: DashboardWidgetLayout[],
  columns: number,
): Pick<DashboardWidgetLayout, "x" | "y"> {
  for (let y = 0; y <= MAX_CANVAS_ROWS - layout.h; y += 1) {
    for (let x = 0; x <= columns - layout.w; x += 1) {
      const candidate = { ...layout, x, y };
      if (!placed.some((item) => collides(candidate, item))) {
        return { x, y };
      }
    }
  }

  return {
    x: 0,
    y: MAX_CANVAS_ROWS - layout.h,
  };
}

function packLayouts(
  nextLayouts: DashboardWidgetLayouts,
  items: DashboardCanvasItem[],
  columns: number,
  anchorId: string | null,
) {
  const packed: DashboardWidgetLayouts = {};
  const visibleItems = items
    .filter((item) => nextLayouts[item.id]?.visible)
    .sort((left, right) => {
      if (left.id === anchorId) {
        return -1;
      }
      if (right.id === anchorId) {
        return 1;
      }

      const leftLayout = nextLayouts[left.id];
      const rightLayout = nextLayouts[right.id];
      if (!leftLayout || !rightLayout) {
        return 0;
      }

      return leftLayout.y - rightLayout.y || leftLayout.x - rightLayout.x;
    });

  for (const item of visibleItems) {
    const base = normalizeLayout(
      nextLayouts[item.id],
      scaledMinWidth(item.minW ?? 2, columns),
      item.minH ?? 2,
      columns,
    );
    const occupied = Object.values(packed).filter((layout) => layout.visible);
    const resolved =
      item.id === anchorId && !occupied.some((layout) => collides(base, layout))
        ? base
        : { ...base, ...findNextSlot(base, occupied, columns) };

    packed[item.id] = resolved;
  }

  for (const item of items) {
    if (packed[item.id]) {
      continue;
    }

    const current = nextLayouts[item.id];
    if (!current) {
      continue;
    }

    packed[item.id] = current.visible
      ? normalizeLayout(
          current,
          scaledMinWidth(item.minW ?? 2, columns),
          item.minH ?? 2,
          columns,
        )
      : current;
  }

  return packed;
}

function projectLayouts(
  baseLayouts: DashboardWidgetLayouts,
  items: DashboardCanvasItem[],
  columns: number,
) {
  const projected: DashboardWidgetLayouts = {};

  for (const item of items) {
    const base = baseLayouts[item.id];
    if (!base) {
      continue;
    }

    const minW = scaledMinWidth(item.minW ?? 2, columns);
    const scaled =
      columns === MOBILE_COLUMNS
        ? {
            ...base,
            x: 0,
            w: 1,
          }
        : {
            ...base,
            x: Math.round((base.x * columns) / LOGICAL_COLUMNS),
            w: Math.max(minW, Math.round((base.w * columns) / LOGICAL_COLUMNS)),
          };

    projected[item.id] = normalizeLayout(scaled, minW, item.minH ?? 2, columns);
  }

  return packLayouts(projected, items, columns, null);
}

function toLogicalLayouts(
  activeLayouts: DashboardWidgetLayouts,
  items: DashboardCanvasItem[],
  columns: number,
  baseLayouts: DashboardWidgetLayouts,
) {
  const nextLayouts: DashboardWidgetLayouts = {};

  for (const item of items) {
    const active = activeLayouts[item.id] ?? baseLayouts[item.id];
    if (!active) {
      continue;
    }

    const base = baseLayouts[item.id];
    if (!active.visible) {
      nextLayouts[item.id] = {
        ...(base ?? active),
        visible: false,
      };
      continue;
    }

    const logical =
      columns === LOGICAL_COLUMNS
        ? active
        : {
            ...active,
            x:
              columns === MOBILE_COLUMNS
                ? base?.x ?? 0
                : Math.round((active.x * LOGICAL_COLUMNS) / columns),
            w:
              columns === MOBILE_COLUMNS
                ? base?.w ?? LOGICAL_COLUMNS
                : Math.max(
                    item.minW ?? 2,
                    Math.round((active.w * LOGICAL_COLUMNS) / columns),
                  ),
          };

    nextLayouts[item.id] = normalizeLayout(
      logical,
      item.minW ?? 2,
      item.minH ?? 2,
      LOGICAL_COLUMNS,
    );
  }

  return nextLayouts;
}

function accentRing(accent: DashboardCanvasItem["accent"]) {
  if (accent === "cyan") {
    return "border-[color:rgba(255,136,62,0.22)]";
  }
  if (accent === "amber") {
    return "border-[color:rgba(255,122,31,0.24)]";
  }
  if (accent === "rose") {
    return "border-[color:rgba(210,96,52,0.22)]";
  }
  return "border-[color:var(--border)]";
}

function isResizeHandle(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("[data-canvas-resize='true']"));
}

function isInteractiveContent(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "a, button, input, textarea, select, summary, label, [role='button'], [role='switch'], [data-canvas-interactive='true']",
      ),
    )
  );
}

function resolveCardSize(layout: DashboardWidgetLayout): DashboardCardSize {
  if ((layout.w >= 6 && layout.h >= 5) || layout.w >= 8) {
    return "hero";
  }

  if (layout.w >= 5 || layout.h >= 5) {
    return "large";
  }

  if (layout.w >= 4 || layout.h >= 4) {
    return "medium";
  }

  return "small";
}

export function DashboardCanvas({
  className,
  items,
  layouts,
  onLayoutsChange,
  renderItem,
}: DashboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const suppressClickRef = useRef(false);
  const [canvasWidth, setCanvasWidth] = useState(1200);
  const [columnCount, setColumnCount] = useState(LOGICAL_COLUMNS);
  const [previewLayouts, setPreviewLayouts] = useState<DashboardWidgetLayouts>(() =>
    projectLayouts(layouts, items, LOGICAL_COLUMNS),
  );
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth) {
        setCanvasWidth(nextWidth);
        setColumnCount(getColumnCount(nextWidth));
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPreviewLayouts(projectLayouts(layouts, items, columnCount));
  }, [columnCount, items, layouts]);

  const canEdit = columnCount !== MOBILE_COLUMNS;
  const columnWidth = useMemo(
    () => Math.max((canvasWidth - GRID_GAP * (columnCount - 1)) / columnCount, 42),
    [canvasWidth, columnCount],
  );
  const rowHeight = useMemo(() => {
    const ratio =
      columnCount === MOBILE_COLUMNS ? 0.18 : columnCount === TABLET_COLUMNS ? 0.48 : 0.68;
    const minHeight =
      columnCount === MOBILE_COLUMNS ? 56 : columnCount === TABLET_COLUMNS ? 72 : 76;
    const maxHeight =
      columnCount === MOBILE_COLUMNS ? 88 : columnCount === TABLET_COLUMNS ? 108 : 128;
    return clamp(Math.round(columnWidth * ratio), minHeight, maxHeight);
  }, [columnCount, columnWidth]);

  useEffect(() => {
    if (!interaction || !canEdit) {
      return;
    }

    const currentInteraction = interaction;
    const stepX = columnWidth + GRID_GAP;
    const stepY = rowHeight + GRID_GAP;

    function handlePointerMove(event: PointerEvent) {
      const deltaX = event.clientX - currentInteraction.startX;
      const deltaY = event.clientY - currentInteraction.startY;
      const passedThreshold =
        Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD;

      let activeMode: InteractionState["mode"] = "pending-drag";
      if (currentInteraction.mode === "resize") {
        activeMode = "resize";
      } else if (passedThreshold) {
        activeMode = "drag";
      }

      if (activeMode === "pending-drag") {
        return;
      }

      suppressClickRef.current = true;

      if (currentInteraction.mode === "pending-drag") {
        setInteraction((current) =>
          current ? { ...current, mode: "drag" } : current,
        );
      }

      if (activeMode === "drag") {
        const nextX = clamp(
          currentInteraction.startLayout.x + Math.round(deltaX / stepX),
          0,
          columnCount - currentInteraction.startLayout.w,
        );
        const nextY = clamp(
          currentInteraction.startLayout.y + Math.round(deltaY / stepY),
          0,
          MAX_CANVAS_ROWS - currentInteraction.startLayout.h,
        );

        setPreviewLayouts((currentLayouts) => ({
          ...currentLayouts,
          [currentInteraction.id]: {
            ...currentLayouts[currentInteraction.id],
            x: nextX,
            y: nextY,
          },
        }));
        return;
      }

      const nextW = clamp(
        currentInteraction.startLayout.w + Math.round(deltaX / stepX),
        scaledMinWidth(
          items.find((item) => item.id === currentInteraction.id)?.minW ?? 2,
          columnCount,
        ),
        columnCount - currentInteraction.startLayout.x,
      );
      const nextH = clamp(
        currentInteraction.startLayout.h + Math.round(deltaY / stepY),
        items.find((item) => item.id === currentInteraction.id)?.minH ?? 2,
        MAX_CANVAS_ROWS - currentInteraction.startLayout.y,
      );

      setPreviewLayouts((currentLayouts) => ({
        ...currentLayouts,
        [currentInteraction.id]: {
          ...currentLayouts[currentInteraction.id],
          w: nextW,
          h: nextH,
        },
      }));
    }

    function handlePointerUp() {
      if (currentInteraction.mode === "pending-drag" && !suppressClickRef.current) {
        setInteraction(null);
        return;
      }

      setPreviewLayouts((currentLayouts) => {
        const packedActive = packLayouts(
          currentLayouts,
          items,
          columnCount,
          currentInteraction.id,
        );
        const nextLogicalLayouts = toLogicalLayouts(
          packedActive,
          items,
          columnCount,
          layouts,
        );
        onLayoutsChange(nextLogicalLayouts);
        return packedActive;
      });
      setInteraction(null);
      globalThis.setTimeout(() => {
        suppressClickRef.current = false;
      }, 120);
    }

    globalThis.addEventListener("pointermove", handlePointerMove);
    globalThis.addEventListener("pointerup", handlePointerUp, { once: true });

    return () => {
      globalThis.removeEventListener("pointermove", handlePointerMove);
      globalThis.removeEventListener("pointerup", handlePointerUp);
    };
  }, [canEdit, columnCount, columnWidth, interaction, items, layouts, onLayoutsChange, rowHeight]);

  const visibleLayouts = items
    .map((item) => ({
      item,
      layout: previewLayouts[item.id],
    }))
    .filter((entry): entry is { item: DashboardCanvasItem; layout: DashboardWidgetLayout } =>
      Boolean(entry.layout?.visible),
    );

  const canvasRows = Math.max(
    MIN_CANVAS_ROWS,
    visibleLayouts.reduce((max, entry) => Math.max(max, entry.layout.y + entry.layout.h), 0),
  );
  const canvasHeight = canvasRows * rowHeight + Math.max(canvasRows - 1, 0) * GRID_GAP;

  return (
    <div
      className={[
        "dashboard-canvas-shell rounded-[36px] p-2.5 sm:p-3",
        className ?? "",
      ].join(" ")}
    >
      <div
        className="dashboard-magic-grid relative rounded-[30px] border border-[color:rgba(255,188,150,0.08)]"
        ref={containerRef}
        style={{
          minHeight: `${canvasHeight}px`,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px)
          `,
          backgroundSize: `${columnWidth + GRID_GAP}px ${rowHeight + GRID_GAP}px`,
          backgroundPosition: "0 0",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, rgba(255,90,0,0.08), transparent 24%), radial-gradient(circle at 100% 78%, rgba(255,122,31,0.1), transparent 24%), radial-gradient(circle at 55% 45%, rgba(255,255,255,0.04), transparent 22%)",
          }}
        />

        {visibleLayouts.map(({ item, layout }) => {
          const isActive = interaction?.id === item.id;
          const width = layout.w * columnWidth + Math.max(layout.w - 1, 0) * GRID_GAP;
          const height = layout.h * rowHeight + Math.max(layout.h - 1, 0) * GRID_GAP;
          const left = layout.x * (columnWidth + GRID_GAP);
          const top = layout.y * (rowHeight + GRID_GAP);
          const size = resolveCardSize(layout);
          const renderMeta: DashboardCanvasRenderMeta = {
            height,
            isCompact: size === "small",
            size,
            width,
          };
          const cardShadow = isActive
            ? "shadow-[0_30px_90px_rgba(20,16,12,0.22)]"
            : "hover:shadow-[0_28px_72px_rgba(28,22,16,0.14)]";

          return (
            <div
              className={[
                "absolute transition-[box-shadow,transform,left,top,width,height] duration-200 ease-out",
                canEdit ? "cursor-grab active:cursor-grabbing" : "",
                isActive ? "z-20 scale-[1.006]" : "z-10",
              ].join(" ")}
              key={item.id}
              onClickCapture={(event) => {
                if (!suppressClickRef.current) {
                  return;
                }

                event.preventDefault();
                event.stopPropagation();
                suppressClickRef.current = false;
              }}
              onPointerDown={(event) => {
                if (
                  !canEdit ||
                  event.button !== 0 ||
                  isResizeHandle(event.target) ||
                  isInteractiveContent(event.target)
                ) {
                  return;
                }

                setInteraction({
                  id: item.id,
                  mode: "pending-drag",
                  startX: event.clientX,
                  startY: event.clientY,
                  startLayout: layout,
                });
              }}
              style={{
                left,
                top,
                width,
                height,
              }}
            >
              <div
                className={[
                  "group relative h-full overflow-hidden rounded-[32px] border bg-[linear-gradient(180deg,rgba(44,17,8,0.96),rgba(23,9,4,0.98))] shadow-[0_22px_56px_rgba(0,0,0,0.26)] transition-[box-shadow,border-color,transform]",
                  accentRing(item.accent),
                  cardShadow,
                ].join(" ")}
                style={{
                  touchAction: canEdit ? "none" : "pan-y",
                }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),transparent)]" />
                <div className="pointer-events-none absolute inset-0 rounded-[32px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]" />

                <div className="h-full">{renderItem(item.id, renderMeta)}</div>

                {canEdit ? (
                  <button
                    aria-label={`Redimensionar ${item.title}`}
                    className="absolute bottom-3 right-3 z-10 h-5 w-5 cursor-se-resize opacity-60 transition group-hover:opacity-100"
                    data-canvas-resize="true"
                    onPointerDown={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      suppressClickRef.current = true;
                      setInteraction({
                        id: item.id,
                        mode: "resize",
                        startX: event.clientX,
                        startY: event.clientY,
                        startLayout: layout,
                      });
                    }}
                    type="button"
                  >
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-br-[9px] border-b-2 border-r-2 border-[color:rgba(255,211,189,0.38)]" />
                    <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-br-[7px] border-b-2 border-r-2 border-[color:rgba(255,211,189,0.2)]" />
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
