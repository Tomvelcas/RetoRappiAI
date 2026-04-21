"use client";

import Image from "next/image";
import Link from "next/link";

type RouteCard = {
  accent: string;
  href: string;
  kind: "chatbot" | "dashboard";
  label: string;
  tone: string;
};

type NavigationChoicePanelProps = {
  routes: ReadonlyArray<RouteCard>;
};

function ArrowIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function CardArtwork({ route }: { route: RouteCard }) {
  if (route.kind === "dashboard") {
    return (
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[52%] min-w-[210px] sm:min-w-[250px]">
        <div className="absolute right-[16%] top-[12%] size-26 rounded-full bg-[radial-gradient(circle,rgba(255,239,224,0.72),rgba(255,151,97,0.4),transparent_72%)] blur-md sm:size-34" />
        <div className="absolute right-[-6%] bottom-[-2%] w-[100%] drop-shadow-[0_36px_68px_rgba(0,0,0,0.34)]">
          <Image
            alt=""
            className="h-auto w-full object-contain"
            height={1024}
            priority
            src="/obj3.png"
            width={1536}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 w-[56%] min-w-[220px] sm:min-w-[270px]">
      <div className="absolute right-[18%] top-[10%] size-26 rounded-full bg-[radial-gradient(circle,rgba(255,246,236,0.76),rgba(255,146,84,0.42),transparent_70%)] blur-md sm:size-34" />
      <div className="absolute right-[-7%] bottom-[-6%] w-[96%] drop-shadow-[0_36px_68px_rgba(0,0,0,0.34)]">
        <Image
          alt=""
          className="h-auto w-full object-contain"
          height={1024}
          priority
          src="/pj2.png"
          width={1536}
        />
      </div>
    </div>
  );
}

function ChoiceCard({
  route,
}: {
  route: RouteCard;
}) {
  const shellClassName = "rappi-choice-card group relative isolate block min-h-[300px] overflow-hidden rounded-[34px] p-6 transition duration-500 will-change-transform sm:min-h-[330px] sm:p-7 lg:min-h-[380px] lg:p-8";

  const content = (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-100"
        style={{
          background: `radial-gradient(circle at 18% 16%, ${route.accent}, transparent 42%), radial-gradient(circle at 80% 82%, rgba(255,255,255,0.11), transparent 26%), linear-gradient(140deg, rgba(255,255,255,0.08), transparent 42%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${route.accent}, transparent)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-4 bottom-3 h-[4.5rem] rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(79,33,15,0.24),rgba(36,16,10,0.46))]"
        style={{
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-[12%] bottom-[-18%] h-24 rounded-full blur-3xl"
        style={{ background: route.accent, opacity: 0.22 }}
      />
      <CardArtwork route={route} />

      <div className="relative z-10 flex h-full max-w-[50%] flex-col justify-between gap-10 sm:max-w-[52%]">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-white/18 bg-white/12 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/76 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            {route.tone}
          </span>
          <h2
            className="max-w-[7ch] text-[clamp(2.85rem,4.8vw,5rem)] font-semibold tracking-[-0.065em] text-white drop-shadow-[0_10px_24px_rgba(0,0,0,0.34)]"
            style={{ fontFamily: "var(--font-heading), serif" }}
          >
            {route.label}
          </h2>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div className="rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
            <div className="flex gap-2">
              <span className="size-2 rounded-full bg-white/88" />
              <span className="size-2 rounded-full bg-white/42" />
              <span className="size-2 rounded-full bg-white/26" />
            </div>
          </div>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-white/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))] text-white shadow-[0_18px_30px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.28),0_0_18px_rgba(255,190,158,0.12)] transition duration-500 group-hover:translate-x-1 group-hover:-translate-y-0.5 group-hover:shadow-[0_22px_36px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.34),0_0_22px_rgba(255,200,170,0.22)]">
            <ArrowIcon />
          </span>
        </div>
      </div>
    </>
  );

  return (
    <Link
      aria-label={route.label}
      className={`${shellClassName} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#090a0f]`}
      data-home-choice-card
      href={route.href}
    >
      {content}
    </Link>
  );
}

export function NavigationChoicePanel({ routes }: NavigationChoicePanelProps) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {routes.map((route) => (
        <ChoiceCard key={route.href} route={route} />
      ))}
    </div>
  );
}
