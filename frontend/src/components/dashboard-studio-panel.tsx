"use client";

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
          ? "border-[color:rgba(255,122,31,0.22)] bg-[color:rgba(255,122,31,0.18)]"
          : "border-[color:var(--border)] bg-[color:rgba(255,255,255,0.04)]",
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
      <div className="dashboard-command-bar pointer-events-auto flex items-center gap-2 rounded-[18px] px-2 py-2">
        <button
          className="rounded-[12px] bg-[color:#fff5ee] px-4 py-2 text-sm font-medium text-[color:#2a1207] transition hover:opacity-92"
          onClick={onToggleCollapsed}
          type="button"
        >
          Filtros
        </button>
        <span className="hidden px-2 py-2 text-xs text-[color:var(--text-soft)] sm:inline-flex">
          {rangeLabel}
        </span>
        {refreshing ? (
          <span className="rounded-[12px] bg-[color:rgba(176,108,31,0.12)] px-3 py-2 text-xs text-[color:var(--signal-amber)]">
            actualizando
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <aside className="dashboard-command-bar pointer-events-auto rounded-[22px] px-4 py-4 shadow-[0_18px_48px_rgba(25,20,15,0.12)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">Filtros</p>
          <p className="mt-1 text-sm text-[color:var(--text-soft)]">
            {rangeLabel} · {selectedDayLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[color:var(--text-soft)]">{itemCountLabel}</span>
          <button
            className="rounded-[12px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.04)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
            onClick={onReset}
            type="button"
          >
            Reset
          </button>
          <button
            className="rounded-[12px] border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.04)] px-3 py-2 text-xs text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
            onClick={onToggleCollapsed}
            type="button"
          >
            Ocultar
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {(Object.keys(presetLabels) as DashboardFilterPreset[]).map((preset) => (
          <button
            className={[
              "rounded-[12px] border px-3 py-2 text-xs font-medium transition",
              activePreset === preset
                ? "border-[color:rgba(255,122,31,0.22)] bg-[color:rgba(255,122,31,0.12)] text-[color:#ffd4bf]"
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

      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_180px_auto]">
        <label className="rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3">
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
        <label className="rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-3">
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

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <button
            className="rounded-[12px] bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
            onClick={onApplyFilters}
            type="button"
          >
            Aplicar
          </button>
          {refreshing ? (
            <span className="rounded-[12px] bg-[color:rgba(176,108,31,0.12)] px-3 py-2 text-xs text-[color:var(--signal-amber)]">
              actualizando
            </span>
          ) : null}
        </div>
      </div>

      {formError ? (
        <p className="mt-3 text-sm text-[color:var(--signal-rose)]">{formError}</p>
      ) : null}

      <div className="glass-scroll mt-4 flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => (
          <div
            className="flex min-w-fit items-center gap-3 rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-3 py-2"
            key={item.id}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-[color:var(--text-strong)]">{item.title}</p>
              {item.pinned ? (
                <span className="rounded-[8px] bg-[color:rgba(255,122,31,0.12)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[color:#ffd4bf]">
                  pin
                </span>
              ) : null}
            </div>
            <VisibilitySwitch
              checked={item.visible}
              onChange={(visible) => onVisibilityChange(item.id, visible)}
            />
          </div>
        ))}
      </div>
    </aside>
  );
}
