"use client";

import Image from "next/image";

type Locale = "en" | "es";

type SolutionArchitectureSectionProps = {
  locale: Locale;
};

const COPY = {
  en: {
    eyebrow: "How It Works",
    intro:
      "This project was built as a disciplined chain: we documented the problem, explored the data deeply, landed a deterministic backend, exposed contracts, and only then shaped a premium product surface around that foundation.",
    stackLabel: "Core stack",
    stackTitle: "The system behind the experience",
    summaryTitle: "From notes to product",
    summaryBody:
      "The robust part is not only the UI. It is the sequence: decisions, notebooks, backend, contracts, product, and quality gates all reinforcing the same story.",
    title: "A robust flow, translated into product",
    steps: [
      {
        body:
          "We started by defining the problem, writing notes, and recording decisions so the solution had a clear product and engineering north star from day one.",
        kicker: "Planning",
        title: "Notes, scope, and decision framing",
      },
      {
        body:
          "The data was explored in notebooks first: profiling files, validating coverage, cleaning windows, and deciding what was truly defendable before building features.",
        kicker: "Understanding",
        title: "Notebook-driven data understanding",
      },
      {
        body:
          "That understanding became the backend core: processed datasets, deterministic analytics, FastAPI endpoints, and typed contracts that keep the truth stable.",
        kicker: "Backend",
        title: "Deterministic services and APIs",
      },
      {
        body:
          "With contracts in place, the frontend could map the system into a dashboard and chatbot that feel premium while still respecting product, brand, and traceability.",
        kicker: "Delivery",
        title: "Premium experience with clear execution paths",
      },
    ],
  },
  es: {
    eyebrow: "Cómo Funciona",
    intro:
      "Este proyecto se construyó como una cadena disciplinada: documentamos el problema, exploramos el dato a profundidad, aterrizamos un backend determinístico, expusimos contratos y solo después diseñamos una superficie premium de producto sobre esa base.",
    stackLabel: "Stack principal",
    stackTitle: "El sistema detrás de la experiencia",
    summaryTitle: "De notas a producto",
    summaryBody:
      "La robustez no está solo en la interfaz. Está en la secuencia: decisiones, notebooks, backend, contratos, producto y calidad reforzando una misma historia.",
    title: "Un flujo robusto, traducido a producto",
    steps: [
      {
        body:
          "Comenzamos definiendo el problema, tomando notas y registrando decisiones para que la solución tuviera una dirección clara de producto e ingeniería desde el inicio.",
        kicker: "Planeación",
        title: "Notas, alcance y decisiones",
      },
      {
        body:
          "El dato se exploró primero en notebooks: perfilar archivos, validar cobertura, limpiar ventanas y decidir qué era realmente defendible antes de construir features.",
        kicker: "Entendimiento",
        title: "Entendimiento del dato con notebooks",
      },
      {
        body:
          "Ese entendimiento se convirtió en el núcleo del backend: datasets procesados, analítica determinística, endpoints en FastAPI y contratos tipados que sostienen la verdad.",
        kicker: "Backend",
        title: "Servicios determinísticos y APIs",
      },
      {
        body:
          "Con contratos claros, el frontend pudo mapear el sistema a dashboard y chatbot con una experiencia premium, sin perder producto, marca ni trazabilidad.",
        kicker: "Entrega",
        title: "Experiencia premium con rutas claras de acción",
      },
    ],
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

const VISUAL_ASSETS = [
  {
    alt: "Rappi companion",
    className: "left-[2%] top-[8%] hidden lg:block w-[8.5rem] xl:w-[10rem]",
    glow: "rgba(255, 152, 98, 0.16)",
    src: "/pj1.png",
  },
  {
    alt: "Commerce emblem",
    className: "right-[7%] top-[12%] hidden lg:block w-[5.5rem] xl:w-[6.75rem]",
    glow: "rgba(255, 192, 106, 0.14)",
    src: "/obj4.webp",
  },
  {
    alt: "Rappi bag",
    className: "right-[3%] bottom-[4%] hidden xl:block w-[12rem] 2xl:w-[14rem]",
    glow: "rgba(255, 128, 76, 0.14)",
    src: "/obj6.png",
  },
] as const;

export function SolutionArchitectureSection({ locale }: SolutionArchitectureSectionProps) {
  const copy = COPY[locale];
  const marquee = [...STACK, ...STACK];

  return (
    <section
      className="relative overflow-hidden bg-[linear-gradient(180deg,#fff5ee_0%,#ffffff_20%,#fff8f2_100%)] px-5 py-18 text-[#25150f] sm:px-8 sm:py-24 lg:px-10 lg:py-28"
      data-solution-section
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,141,74,0.13),transparent_18%),radial-gradient(circle_at_84%_14%,rgba(255,194,154,0.18),transparent_16%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.18)_18%,transparent_34%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[14%] top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,108,39,0.42),transparent)]"
      />

      {VISUAL_ASSETS.map((asset) => (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute z-0 ${asset.className}`}
          key={asset.src}
        >
          <div className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: asset.glow }} />
          <div className="home-cinematic-asset relative opacity-[0.9]">
            <Image alt={asset.alt} className="h-auto w-full object-contain" height={1024} src={asset.src} width={1536} />
          </div>
        </div>
      ))}

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-12">
        <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-[#f0c8b2] bg-white/88 px-4 py-1.5 text-[0.68rem] uppercase tracking-[0.28em] text-[#b45521] shadow-[0_18px_45px_rgba(164,83,31,0.08)]">
              {copy.eyebrow}
            </div>
            <h2
              className="max-w-[11ch] text-[clamp(2.8rem,4.7vw,5rem)] font-semibold leading-[0.92] tracking-[-0.065em] text-[#22130d]"
              style={{ fontFamily: "var(--font-heading), serif" }}
            >
              {copy.title}
            </h2>
            <p className="max-w-[34ch] text-[1rem] leading-7 text-[#5d4134] sm:text-[1.05rem]">{copy.intro}</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <article className="solution-feature-card relative overflow-hidden rounded-[32px] border border-[#f1d5c4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,244,0.94))] p-6 shadow-[0_26px_64px_rgba(91,37,14,0.11),inset_0_1px_0_rgba(255,255,255,0.94)] sm:col-span-2">
              <div className="space-y-3">
                <div className="text-[0.72rem] uppercase tracking-[0.28em] text-[#b45a29]">{copy.summaryTitle}</div>
                <p
                  className="max-w-[40ch] text-[1.55rem] font-semibold leading-[1.02] tracking-[-0.045em] text-[#23150e]"
                  style={{ fontFamily: "var(--font-heading), serif" }}
                >
                  {copy.summaryBody}
                </p>
              </div>
            </article>

            <article className="solution-feature-card relative overflow-hidden rounded-[30px] border border-[#f1d5c4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,244,0.94))] p-6 shadow-[0_22px_54px_rgba(91,37,14,0.09),inset_0_1px_0_rgba(255,255,255,0.94)]">
              <div className="space-y-3">
                <div className="text-[0.72rem] uppercase tracking-[0.24em] text-[#b45a29]">Backend first</div>
                <p className="text-[0.98rem] leading-7 text-[#6b4b3d]">
                  FastAPI, analítica determinística y contratos tipados sostienen el producto antes de pensar en la capa visual.
                </p>
              </div>
            </article>

            <article className="solution-feature-card relative overflow-hidden rounded-[30px] border border-[#f1d5c4] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,244,0.94))] p-6 shadow-[0_22px_54px_rgba(91,37,14,0.09),inset_0_1px_0_rgba(255,255,255,0.94)]">
              <div className="space-y-3">
                <div className="text-[0.72rem] uppercase tracking-[0.24em] text-[#b45a29]">Quality loop</div>
                <p className="text-[0.98rem] leading-7 text-[#6b4b3d]">
                  GitHub, tests y SonarCloud cierran la experiencia para que la solución se vea bien y además sea defendible.
                </p>
              </div>
            </article>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
          <div className="space-y-4">
            <div className="text-[0.72rem] uppercase tracking-[0.26em] text-[#a65b34]">{copy.stackTitle}</div>
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
            <div className="rounded-[28px] border border-[#f1d6c7] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,249,245,0.92))] p-5 shadow-[0_22px_54px_rgba(91,37,14,0.08)]">
              <div className="text-[0.72rem] uppercase tracking-[0.24em] text-[#b45a29]">{copy.stackLabel}</div>
              <p className="mt-3 max-w-[34ch] text-[0.98rem] leading-7 text-[#6b4b3d]">
                Notion ordena la planeación, Jupyter explica el dato, Python y FastAPI sostienen el core, y Next.js con React y Tailwind convierten todo eso en producto usable.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {copy.steps.map((step, index) => (
              <article
                className={`solution-step-card relative overflow-hidden rounded-[30px] border border-[#f4d7c7] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,248,244,0.94))] p-6 shadow-[0_24px_58px_rgba(91,37,14,0.1),inset_0_1px_0_rgba(255,255,255,0.94)] ${index === 0 ? "md:translate-y-6" : ""} ${index === 1 ? "md:-translate-y-2" : ""} ${index === 2 ? "md:translate-y-2" : ""} ${index === 3 ? "md:-translate-y-4" : ""}`}
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
                    <div className="space-y-1">
                      <div className="text-[0.68rem] uppercase tracking-[0.24em] text-[#b45a29]">{step.kicker}</div>
                      <h3
                        className="max-w-[15ch] text-[1.25rem] font-semibold leading-tight tracking-[-0.04em] text-[#24150f]"
                        style={{ fontFamily: "var(--font-heading), serif" }}
                      >
                        {step.title}
                      </h3>
                    </div>
                  </div>
                  <p className="max-w-[42ch] text-[0.98rem] leading-7 text-[#6b4b3d]">{step.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
