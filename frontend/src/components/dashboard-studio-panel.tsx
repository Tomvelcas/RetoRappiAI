"use client";

import { InfoTooltip } from "@/components/ui/info-tooltip";

export type DashboardStudioItem = {
  id: string;
  title: string;
  description: string;
  visible: boolean;
  pinned?: boolean;
};

export type DashboardFilterPreset = "full" | "last5" | "last3" | "fragile";

type DashboardStudioPanelProps = Readonly<{
  activePreset: DashboardFilterPreset;
  collapsed: boolean;
  draftEndDate: string;
  draftStartDate: string;
  formError: string | null;
  itemCountLabel: string;
  items: DashboardStudioItem[];
  rangeLabel: string;
  refreshing: boolean;
  selectedDayLabel: string;
  onApplyFilters: () => void;
  onEndDateChange: (value: string) => void;
  onPresetSelect: (preset: DashboardFilterPreset) => void;
  onReset: () => void;
  onStartDateChange: (value: string) => void;
  onToggleCollapsed: () => void;
  onVisibilityChange: (id: string, visible: boolean) => void;
}>;

const presetLabels: Record<DashboardFilterPreset, string> = {
  full: "Todo",
  last5: "Últimos 5",
  last3: "Últimos 3",
  fragile: "Más frágil",
};

function VisibilitySwitch({
  checked,
  onChange,
}: Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  return (
    <button
      aria-checked={checked}
      className={[
        "relative inline-flex h-7 w-12 shrink-0 rounded-full border transition",
        checked
          ? "border-[color:rgba(21,125,120,0.24)] bg-[color:rgba(21,125,120,0.18)]"
          : "border-[color:var(--border)] bg-[color:rgba(32,27,23,0.08)]",
      ].join(" ")}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        className={[
          "absolute top-1 inline-flex size-5 rounded-full bg-[color:var(--surface-strong)] shadow-[0_8px_14px_rgba(22,18,13,0.18)] transition",
          checked ? "left-6" : "left-1",
        ].join(" ")}
      />
    </button>
  );
}

export function DashboardStudioPanel({
  activePreset,
  collapsed,
  draftEndDate,
  draftStartDate,
  formError,
  itemCountLabel,
  items,
  rangeLabel,
  refreshing,
  selectedDayLabel,
  onApplyFilters,
  onEndDateChange,
  onPresetSelect,
  onReset,
  onStartDateChange,
  onToggleCollapsed,
  onVisibilityChange,
}: DashboardStudioPanelProps) {
  if (collapsed) {
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:rgba(255,252,247,0.92)] p-1 shadow-[var(--shadow-soft)] backdrop-blur-xl">
        <button
          className="rounded-full bg-[color:var(--text-strong)] px-4 py-2 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
          onClick={onToggleCollapsed}
          type="button"
        >
          Panel
        </button>
        <span className="hidden rounded-full px-3 py-2 text-xs text-[color:var(--text-soft)] sm:inline-flex">
          {itemCountLabel}
        </span>
        {refreshing ? (
          <span className="rounded-full bg-[color:rgba(176,108,31,0.12)] px-3 py-2 text-xs text-[color:var(--signal-amber)]">
            actualizando
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <aside className="panel pointer-events-auto w-[min(360px,calc(100vw-2rem))] rounded-[28px] border border-[color:var(--border)] p-4 shadow-[0_28px_80px_rgba(25,20,15,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="eyebrow">Panel del canvas</p>
            <InfoTooltip content="Use este panel para cambiar el rango, mostrar u ocultar piezas y restablecer el acomodo del tablero sin sacrificar espacio visual." />
          </div>
          <p className="mt-2 text-sm leading-6 text-[color:var(--text-soft)]">
            Ajuste el tablero en segundos y vuelva a colapsarlo.
          </p>
        </div>

        <button
          className="rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.7)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
          onClick={onToggleCollapsed}
          type="button"
        >
          Ocultar
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.74)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Rango
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">{rangeLabel}</p>
        </div>
        <div className="rounded-[20px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.74)] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
            Día activo
          </p>
          <p className="mt-2 text-sm font-medium text-[color:var(--text-strong)]">
            {selectedDayLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.72)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[color:var(--text-strong)]">Filtros rápidos</p>
          <span className="text-xs text-[color:var(--text-soft)]">{itemCountLabel}</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(presetLabels) as DashboardFilterPreset[]).map((preset) => (
            <button
              className={[
                "rounded-full border px-3 py-2 text-xs font-medium transition",
                activePreset === preset
                  ? "border-[color:rgba(21,125,120,0.22)] bg-[color:rgba(21,125,120,0.08)] text-[color:var(--signal-cyan)]"
                  : "border-[color:var(--border)] text-[color:var(--text-soft)] hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]",
              ].join(" ")}
              key={preset}
              onClick={() => onPresetSelect(preset)}
              type="button"
            >
              {presetLabels[preset]}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-3">
          <label className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Desde
            </p>
            <input
              className="mt-2 w-full bg-transparent text-sm text-[color:var(--text-strong)] outline-none"
              onChange={(event) => onStartDateChange(event.target.value)}
              type="date"
              value={draftStartDate}
            />
          </label>
          <label className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--text-dim)]">
              Hasta
            </p>
            <input
              className="mt-2 w-full bg-transparent text-sm text-[color:var(--text-strong)] outline-none"
              onChange={(event) => onEndDateChange(event.target.value)}
              type="date"
              value={draftEndDate}
            />
          </label>
        </div>

        <button
          className="mt-3 w-full rounded-[18px] bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
          onClick={onApplyFilters}
          type="button"
        >
          Aplicar rango
        </button>

        {formError ? (
          <p className="mt-3 text-sm text-[color:var(--signal-rose)]">{formError}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.72)] p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-[color:var(--text-strong)]">Piezas visibles</p>
          <button
            className="rounded-full border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
            onClick={onReset}
            type="button"
          >
            Restablecer layout
          </button>
        </div>

        <div className="glass-scroll mt-3 max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => (
            <div
              className="rounded-[18px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-[color:var(--text-strong)]">
                      {item.title}
                    </p>
                    {item.pinned ? (
                      <span className="rounded-full bg-[color:rgba(21,125,120,0.08)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--signal-cyan)]">
                        pin
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--text-soft)]">
                    {item.description}
                  </p>
                </div>

                <VisibilitySwitch
                  checked={item.visible}
                  onChange={(visible) => onVisibilityChange(item.id, visible)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
