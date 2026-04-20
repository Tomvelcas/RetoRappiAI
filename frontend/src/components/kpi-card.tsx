type KpiCardProps = {
  label: string;
  value: string;
  caption: string;
  accent: "cyan" | "amber" | "rose";
};

const accentBorder = {
  cyan: "border-l-[color:rgba(21,125,120,0.34)]",
  amber: "border-l-[color:rgba(176,108,31,0.34)]",
  rose: "border-l-[color:rgba(178,76,89,0.34)]",
};

export function KpiCard({ label, value, caption, accent }: KpiCardProps) {
  return (
    <article className="panel rounded-[28px] p-5 sm:p-6">
      <div className={`border-l-2 pl-4 ${accentBorder[accent]}`}>
        <p className="eyebrow">{label}</p>
        <p
          className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[color:var(--text-strong)]"
          style={{ fontFamily: "var(--font-heading), serif" }}
        >
          {value}
        </p>
        <p className="mt-3 max-w-xs text-sm leading-6 text-[color:var(--text-soft)]">{caption}</p>
      </div>
    </article>
  );
}
