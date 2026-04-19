import { BackendStatusBadge } from "@/components/backend-status-badge";
import { ChatPanel } from "@/components/chat-panel";
import { KpiCard } from "@/components/kpi-card";
import { SectionCard } from "@/components/section-card";

const placeholderKpis = [
  {
    label: "Availability Rate",
    value: "96.4%",
    change: "+1.2 pts",
  },
  {
    label: "Affected Stores",
    value: "14",
    change: "-3 stores",
  },
  {
    label: "Incident Hours",
    value: "27",
    change: "-8.5%",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-8 lg:px-10">
      <header className="mb-8 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 inline-flex rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
              Analytics-first chatbot scaffold
            </p>
            <h1
              className="text-4xl font-semibold tracking-tight text-balance md:text-5xl"
              style={{ fontFamily: "var(--font-heading), sans-serif" }}
            >
              Historical store availability, shaped for deterministic insight.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-[color:var(--muted)] md:text-base">
              This initial shell is ready for validated KPIs, grounded narratives, and
              production-like iteration. The current numbers are mocked by design.
            </p>
          </div>
          <BackendStatusBadge />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {placeholderKpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_0.9fr]">
        <SectionCard
          eyebrow="Chart Placeholder"
          title="Availability Trend"
          description="A chart module will later visualize validated availability patterns, anomalies, and cohort comparisons."
        >
          <div className="relative mt-6 h-72 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-6">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-teal-100 via-amber-50 to-cyan-50" />
            <div className="relative flex h-full items-end justify-between gap-3">
              {[42, 58, 53, 67, 61, 74, 70].map((height, index) => (
                <div
                  key={index}
                  className="flex flex-1 flex-col items-center gap-3"
                >
                  <div
                    className="w-full rounded-t-2xl bg-gradient-to-t from-teal-600 to-teal-300"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-xs font-medium text-[color:var(--muted)]">
                    D{index + 1}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <ChatPanel />
      </section>
    </main>
  );
}
