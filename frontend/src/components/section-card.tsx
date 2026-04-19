type SectionCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[var(--shadow)] backdrop-blur">
      <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
        {eyebrow}
      </p>
      <h2
        className="mt-2 text-2xl font-semibold"
        style={{ fontFamily: "var(--font-heading), sans-serif" }}
      >
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted)]">
        {description}
      </p>
      {children}
    </section>
  );
}
