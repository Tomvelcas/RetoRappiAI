"use client";

type Locale = "en" | "es";

type SolutionArchitectureSectionProps = {
  locale: Locale;
};

const COPY = {
  en: {
    eyebrow: "How It Works",
    intro:
      "This is not a loose demo. The project was built as an intentional chain: we documented the problem, explored the data in notebooks, translated that understanding into a deterministic backend, exposed clear contracts, and only then shaped a premium product surface around it.",
    stackLabel: "Core stack",
    steps: [
      {
        body:
          "We began by framing the product, documenting decisions, and using docs and notes as the source of truth so every later tradeoff stayed aligned with the real problem.",
        title: "Frame the problem",
      },
      {
        body:
          "The first technical layer was notebook-driven understanding: profiling files, validating coverage, sanitizing windows, and deciding what claims the product could actually defend.",
        title: "Understand the data",
      },
      {
        body:
          "From that analysis we landed the core backend: deterministic analytics, processed tables, typed schemas, and FastAPI endpoints that keep the numerical truth stable and reusable.",
        title: "Build the backend core",
      },
      {
        body:
          "With contracts in place, the system could connect interfaces, chat flows, and tool orchestration without breaking traceability or inventing unsupported behavior.",
        title: "Expose contracts and orchestration",
      },
      {
        body:
          "Only after that foundation did we craft the frontend, dashboard, chatbot, motion, and brand expression so the experience feels premium while still grounded in real engineering discipline.",
        title: "Deliver the product surface",
      },
    ],
    title: "A complete flow, built with engineering depth",
  },
  es: {
    eyebrow: "Cómo Funciona",
    intro:
      "Esto no es una demo suelta. El proyecto se construyó como una cadena intencional: documentamos el problema, exploramos el dato en notebooks, llevamos ese entendimiento a un backend determinístico, expusimos contratos claros y solo después diseñamos una superficie de producto premium sobre esa base.",
    stackLabel: "Stack principal",
    steps: [
      {
        body:
          "Comenzamos aterrizando el problema, documentando decisiones y usando notas y docs como fuente de verdad para que cada trade-off posterior siguiera alineado con la realidad del reto.",
        title: "Enmarcar el problema",
      },
      {
        body:
          "La primera capa técnica fue el entendimiento en notebooks: perfilar archivos, validar cobertura, sanitizar ventanas y decidir qué claims eran realmente defendibles con el dato.",
        title: "Entender el dato",
      },
      {
        body:
          "A partir de ese análisis aterrizamos el núcleo del backend: analítica determinística, tablas procesadas, schemas tipados y endpoints en FastAPI para sostener una verdad numérica estable.",
        title: "Construir el backend",
      },
      {
        body:
          "Con contratos claros, el sistema pudo conectar interfaces, flujos de chat y orquestación de herramientas sin romper trazabilidad ni inventar capacidades que el dato no soporta.",
        title: "Exponer contratos y orquestación",
      },
      {
        body:
          "Solo después de esa base diseñamos frontend, dashboard, chatbot, motion y expresión de marca para que la experiencia se sienta premium sin perder rigor de ingeniería.",
        title: "Entregar la experiencia premium",
      },
    ],
    title: "Un flujo completo, construido con profundidad de ingeniería",
  },
} as const;

const STACK = [
  { label: "Notion", src: "/stack/notion.svg" },
  { label: "Jupyter", src: "/stack/jupyter.svg" },
  { label: "Python", src: "/stack/python.svg" },
  { label: "FastAPI", src: "/stack/fastapi.svg" },
  { label: "Next.js", src: "/stack/nextjs.svg" },
  { label: "React", src: "/stack/react.svg" },
  { label: "Tailwind CSS", src: "/stack/tailwindcss.svg" },
  { label: "GitHub", src: "/stack/github.svg" },
  { label: "SonarQube Cloud", src: "/stack/sonarqubecloud.svg" },
] as const;

export function SolutionArchitectureSection({ locale }: SolutionArchitectureSectionProps) {
  const copy = COPY[locale];
  const marquee = [...STACK, ...STACK];

  return (
    <section
      className="relative overflow-hidden bg-[linear-gradient(180deg,#fff6ef_0%,#ffffff_24%,#fffaf6_100%)] px-5 py-18 text-[#25150f] sm:px-8 sm:py-24 lg:px-10 lg:py-28"
      data-solution-section
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,139,74,0.12),transparent_20%),radial-gradient(circle_at_82%_16%,rgba(255,184,140,0.12),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.18)_18%,transparent_36%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[14%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,108,39,0.42),transparent)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[#f0c8b2] bg-white/88 px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.28em] text-[#b45521] shadow-[0_18px_45px_rgba(164,83,31,0.08)]">
              {copy.eyebrow}
            </div>
            <h2
              className="max-w-[13ch] text-[clamp(2.7rem,4.4vw,4.8rem)] font-semibold leading-[0.95] tracking-[-0.06em] text-[#22130d]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              {copy.title}
            </h2>
          </div>

          <div className="rounded-[32px] border border-[#f2d6c5] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,243,0.92))] p-6 shadow-[0_28px_70px_rgba(84,33,12,0.12),inset_0_1px_0_rgba(255,255,255,0.92)]">
            <p className="max-w-[36ch] text-justify text-[1rem] leading-7 text-[#5d4134] sm:text-[1.05rem]">
              {copy.intro}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {copy.steps.map((step, index) => (
            <article
              className="solution-step-card relative overflow-hidden rounded-[30px] border border-[#f4d7c7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,244,0.94))] p-6 shadow-[0_24px_58px_rgba(91,37,14,0.1),inset_0_1px_0_rgba(255,255,255,0.94)]"
              data-solution-card
              key={step.title}
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(238,130,65,0.46),transparent)]"
              />
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#ff7a1f,#d45517)] text-sm font-semibold text-white shadow-[0_14px_34px_rgba(212,85,23,0.22)]">
                    {`0${index + 1}`}
                  </div>
                  <h3
                    className="max-w-[16ch] text-[1.34rem] font-semibold leading-tight tracking-[-0.04em] text-[#24150f]"
                    style={{ fontFamily: "var(--font-heading), serif" }}
                  >
                    {step.title}
                  </h3>
                </div>
                <p className="max-w-[44ch] text-justify text-[0.98rem] leading-7 text-[#6b4b3d]">{step.body}</p>
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-4">
          <div className="text-[0.72rem] uppercase tracking-[0.26em] text-[#a65b34]">{copy.stackLabel}</div>
          <div className="logo-marquee-shell overflow-hidden rounded-[999px] border border-[#f1d3c2] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,247,241,0.88))] py-3 shadow-[0_22px_50px_rgba(91,37,14,0.08)]">
            <div className="logo-marquee-track flex min-w-max items-center gap-3 px-3">
              {marquee.map((item, index) => (
                <div
                  className="stack-logo-chip inline-flex items-center gap-3 rounded-full px-4 py-2.5 text-sm text-[#3f271d]"
                  data-solution-stage
                  key={`${item.label}-${index}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center">
                    <img alt={item.label} className="h-7 w-auto object-contain" loading="lazy" src={item.src} />
                  </span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
