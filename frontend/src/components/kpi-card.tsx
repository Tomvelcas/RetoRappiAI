type KpiCardProps = {
  label: string;
  value: string;
  caption: string;
  accent: "cyan" | "amber" | "rose" | "ink";
};

const accentMap = {
  cyan: "from-[color:rgba(90,214,195,0.18)] to-transparent text-[color:var(--signal-cyan)]",
  amber: "from-[color:rgba(255,188,92,0.16)] to-transparent text-[color:var(--signal-amber)]",
  rose: "from-[color:rgba(255,121,137,0.16)] to-transparent text-[color:var(--signal-rose)]",
  ink: "from-[color:rgba(122,149,255,0.16)] to-transparent text-[color:#a6bbff]",
};

export function KpiCard({ label, value, caption, accent }: KpiCardProps) {
  return (
    <article className="panel rounded-[28px] p-5 sm:p-6">
      <div
        className={[
          "absolute inset-x-0 top-0 h-28 bg-gradient-to-b blur-2xl",
          accentMap[accent],
        ].join(" ")}
      />
      <div className="relative">
        <p className="eyebrow">{label}</p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <p
            className="text-4xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)] sm:text-5xl"
            style={{ fontFamily: "var(--font-heading), sans-serif" }}
          >
            {value}
          </p>
          <div
            className={[
              "signal-ring grid size-12 place-items-center rounded-full border border-[color:var(--border)] bg-[color:rgba(255,255,255,0.03)] text-xs uppercase tracking-[0.18em]",
              accent === "cyan"
                ? "text-[color:var(--signal-cyan)]"
                : accent === "amber"
                  ? "text-[color:var(--signal-amber)]"
                  : accent === "rose"
                    ? "text-[color:var(--signal-rose)]"
                    : "text-[color:#a6bbff]",
            ].join(" ")}
          >
            {label.slice(0, 1)}
          </div>
        </div>
        <p className="mt-4 max-w-xs text-sm leading-6 text-[color:var(--text-soft)]">{caption}</p>
      </div>
    </article>
  );
}
