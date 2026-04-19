type KpiCardProps = {
  label: string;
  value: string;
  change: string;
};

export function KpiCard({ label, value, change }: KpiCardProps) {
  return (
    <article className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-[var(--shadow)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
        {label}
      </p>
      <p
        className="mt-5 text-4xl font-semibold"
        style={{ fontFamily: "var(--font-heading), sans-serif" }}
      >
        {value}
      </p>
      <p className="mt-3 text-sm font-medium text-teal-700">{change}</p>
    </article>
  );
}
