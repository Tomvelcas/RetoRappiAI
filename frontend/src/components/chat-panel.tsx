import Link from "next/link";

type ChatPanelProps = {
  prompts: string[];
};

export function ChatPanel({ prompts }: ChatPanelProps) {
  return (
    <div className="panel rounded-[30px] p-5">
      <p className="eyebrow">Siguiente paso</p>
      <h3
        className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[color:var(--text-strong)]"
        style={{ fontFamily: "var(--font-heading), serif" }}
      >
        Lleve este día al copiloto.
      </h3>
      <p className="mt-3 text-sm leading-7 text-[color:var(--text-soft)]">
        Mantenga la pregunta simple. La respuesta seguirá anclada al dashboard.
      </p>

      <div className="mt-5 flex flex-col gap-2">
        {prompts.map((prompt) => (
          <Link
            key={prompt}
            className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--surface-strong)] px-4 py-3 text-sm text-[color:var(--text-soft)] transition hover:border-[color:var(--border-strong)] hover:text-[color:var(--text-strong)]"
            href={`/chat?question=${encodeURIComponent(prompt)}`}
          >
            {prompt}
          </Link>
        ))}
      </div>

      <Link
        className="mt-5 inline-flex rounded-full bg-[color:var(--text-strong)] px-4 py-3 text-sm font-medium text-[color:var(--surface-strong)] transition hover:opacity-92"
        href="/chat"
      >
        Abrir copiloto completo
      </Link>
    </div>
  );
}
