"use client";

import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Orb from "@/components/effects/orb";
import { LandingParticleField } from "@/components/effects/landing-particle-field";

type PortalId = "copilot" | "dashboard";

type PortalDefinition = {
  accent: string;
  href: string;
  id: PortalId;
  label: string;
  meta: string;
  particleLabel: string;
};

const portals: PortalDefinition[] = [
  {
    accent: "rgba(97, 236, 228, 0.38)",
    href: "/dashboard",
    id: "dashboard",
    label: "Dashboard",
    meta: "canvas vivo",
    particleLabel: "DASHBOARD",
  },
  {
    accent: "rgba(255, 126, 162, 0.4)",
    href: "/chat",
    id: "copilot",
    label: "Copilot",
    meta: "motor grounded",
    particleLabel: "COPILOT",
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function StarterPage() {
  const router = useRouter();
  const shellRef = useRef<HTMLElement>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const transitionTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  const [activePortalId, setActivePortalId] = useState<PortalId | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [transitioningPortalId, setTransitioningPortalId] = useState<PortalId | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const activePortal = useMemo(
    () => portals.find((portal) => portal.id === activePortalId) ?? null,
    [activePortalId],
  );

  const transitioningPortal = useMemo(
    () => portals.find((portal) => portal.id === transitioningPortalId) ?? null,
    [transitioningPortalId],
  );

  const currentPortal = transitioningPortal ?? activePortal;
  const introPhase = clamp(1 - scrollProgress / 0.34, 0, 1);
  const orbPhase = clamp((scrollProgress - 0.12) / 0.26, 0, 1);
  const portalPhase = clamp((scrollProgress - 0.28) / 0.2, 0, 1);
  const dockLift = (1 - portalPhase) * 42;

  const activeLabel = currentPortal?.particleLabel ?? (scrollProgress < 0.24 ? "RETO RAPPI AI" : null);
  const particleMode = currentPortal?.id ?? "idle";

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    let frameId = 0;

    const tick = () => {
      const current = pointerCurrentRef.current;
      const target = pointerTargetRef.current;

      current.x += (target.x - current.x) * 0.09;
      current.y += (target.y - current.y) * 0.09;

      shell.style.setProperty("--landing-shift-x", current.x.toFixed(4));
      shell.style.setProperty("--landing-shift-y", current.y.toFixed(4));
      frameId = globalThis.requestAnimationFrame(tick);
    };

    frameId = globalThis.requestAnimationFrame(tick);

    return () => globalThis.cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return;
    }

    let frameId = 0;

    const measure = () => {
      const rect = shell.getBoundingClientRect();
      const range = Math.max(rect.height - globalThis.innerHeight, 1);
      const nextProgress = clamp(-rect.top / range, 0, 1);

      shell.style.setProperty("--landing-progress", nextProgress.toFixed(4));
      setScrollProgress((current) => (Math.abs(current - nextProgress) > 0.002 ? nextProgress : current));
    };

    const queueMeasure = () => {
      if (frameId) {
        return;
      }

      frameId = globalThis.requestAnimationFrame(() => {
        frameId = 0;
        measure();
      });
    };

    measure();
    globalThis.addEventListener("scroll", queueMeasure, { passive: true });
    globalThis.addEventListener("resize", queueMeasure);

    return () => {
      if (frameId) {
        globalThis.cancelAnimationFrame(frameId);
      }
      globalThis.removeEventListener("scroll", queueMeasure);
      globalThis.removeEventListener("resize", queueMeasure);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        globalThis.clearTimeout(transitionTimerRef.current);
      }
    };
  }, []);

  function handlePointerMove(event: ReactPointerEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerTargetRef.current = {
      x: ((event.clientX - rect.left) / rect.width - 0.5) * 2,
      y: ((event.clientY - rect.top) / rect.height - 0.5) * 2,
    };
  }

  function resetPointer() {
    pointerTargetRef.current = { x: 0, y: 0 };
  }

  function handlePortalLeave(portalId: PortalId) {
    setActivePortalId((current) => (current === portalId ? null : current));
  }

  function handlePortalEnter(portalId: PortalId) {
    if (transitioningPortalId) {
      return;
    }

    setActivePortalId(portalId);
  }

  function handlePortalSelect(portal: PortalDefinition) {
    if (transitioningPortalId) {
      return;
    }

    if (reducedMotion) {
      router.push(portal.href);
      return;
    }

    setTransitioningPortalId(portal.id);
    setActivePortalId(portal.id);

    transitionTimerRef.current = globalThis.setTimeout(() => {
      router.push(portal.href);
    }, 760);
  }

  const orbScale = transitioningPortal ? 1.72 : 0.72 + orbPhase * 0.28;
  const orbOpacity = transitioningPortal ? 1 : orbPhase;

  return (
    <main className="relative z-10">
      <section
        className="landing-shell relative h-[240svh]"
        onPointerLeave={resetPointer}
        onPointerMove={handlePointerMove}
        ref={shellRef}
      >
        <div className="landing-stage sticky top-0 h-dvh overflow-hidden bg-[#07060d] text-[color:rgba(255,247,242,0.96)]">
          <LandingParticleField activeLabel={activeLabel} mode={particleMode} />

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,208,136,0.12),transparent_18%),radial-gradient(circle_at_18%_18%,rgba(234,77,161,0.15),transparent_24%),radial-gradient(circle_at_82%_10%,rgba(143,103,255,0.14),transparent_24%),linear-gradient(180deg,rgba(6,6,12,0.34),rgba(4,4,9,0.76))]" />
          <div className="landing-grid absolute inset-0 opacity-30" />
          <div className="landing-vignette absolute inset-0" />
          <div className="landing-top-aurora absolute inset-x-0 top-0 h-[22vh]" />
          <div className="landing-bottom-glow absolute inset-x-0 bottom-[-16vh] h-[40vh]" />

          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 pt-6 sm:px-8 lg:px-10">
            <div className="landing-mini-brand rounded-full border border-[color:rgba(255,255,255,0.12)] px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-[color:rgba(255,238,230,0.72)] backdrop-blur-xl">
              RetoRappiAI
            </div>
            <div className="rounded-full border border-[color:rgba(255,255,255,0.08)] px-3 py-2 text-[10px] uppercase tracking-[0.24em] text-[color:rgba(255,235,226,0.48)] backdrop-blur-xl">
              02 portales
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-[2]">
            <div
              className="landing-wordmark absolute inset-x-0 top-[14vh] flex justify-center px-4 text-center"
              style={{ opacity: introPhase } as CSSProperties}
            >
              <div className="landing-parallax-far max-w-[15ch]">
                <p
                  className="text-[clamp(4rem,13vw,12rem)] font-semibold uppercase leading-[0.82] tracking-[-0.09em] text-white/16"
                  style={{ fontFamily: "var(--font-heading), serif" }}
                >
                  RetoRappiAI
                </p>
              </div>
            </div>

            <div className="absolute inset-x-0 top-1/2 z-[3] flex -translate-y-1/2 justify-center">
              <div className="landing-parallax-orb pointer-events-none" style={{ opacity: orbOpacity }}>
                <div
                  className="landing-orb-stage relative"
                  style={
                    {
                      transform: `scale(${orbScale}) translateY(${(1 - orbPhase) * 30}px)`,
                    } as CSSProperties
                  }
                >
                  <div className="landing-orb-halo absolute inset-[-16%] rounded-full" />
                  <div className="absolute inset-[9%] rounded-full border border-[color:rgba(255,255,255,0.14)] bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.12),transparent_30%),rgba(7,7,13,0.28)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md" />
                  <div className="absolute inset-[15%] overflow-hidden rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[radial-gradient(circle_at_38%_26%,rgba(255,255,255,0.08),transparent_34%),rgba(7,7,14,0.76)]">
                    <Orb
                      backgroundColor="#05050d"
                      forceHoverState={Boolean(currentPortal)}
                      hoverIntensity={0.42}
                      hue={currentPortal?.id === "dashboard" ? -52 : currentPortal?.id === "copilot" ? 12 : -8}
                      rotateOnHover
                      thinkingIntensity={currentPortal ? 0.96 : 0.48}
                    />
                  </div>
                  <div className="absolute inset-[3%] rounded-full border border-[color:rgba(255,255,255,0.08)]" />
                </div>
              </div>
            </div>

            <div className="absolute inset-x-0 bottom-[10vh] z-[4] flex justify-center px-5 sm:px-8 lg:bottom-[8vh]">
              <div
                className={[
                  "landing-parallax-near w-full max-w-[920px]",
                  portalPhase > 0.14 && !transitioningPortal ? "pointer-events-auto" : "pointer-events-none",
                ].join(" ")}
                style={
                  {
                    opacity: portalPhase,
                    transform: `translateY(${dockLift}px)`,
                  } as CSSProperties
                }
              >
                <div className="landing-dock-frame mx-auto flex w-full max-w-[720px] flex-col gap-3 rounded-[34px] border border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(11,10,19,0.66),rgba(8,8,15,0.86))] p-3 shadow-[0_24px_80px_rgba(3,2,8,0.42)] backdrop-blur-xl sm:flex-row">
                  {portals.map((portal) => {
                    const isActive = currentPortal?.id === portal.id;

                    return (
                      <button
                        className={[
                          "landing-portal-button group relative flex min-h-[92px] flex-1 items-center justify-between overflow-hidden rounded-[26px] border px-5 py-4 text-left transition duration-500",
                          isActive
                            ? "border-[color:rgba(255,255,255,0.18)] bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.05))]"
                            : "border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] hover:border-[color:rgba(255,255,255,0.16)]",
                        ].join(" ")}
                        key={portal.id}
                        onBlur={() => handlePortalLeave(portal.id)}
                        onClick={() => handlePortalSelect(portal)}
                        onFocus={() => handlePortalEnter(portal.id)}
                        onMouseEnter={() => handlePortalEnter(portal.id)}
                        onMouseLeave={() => handlePortalLeave(portal.id)}
                        style={{ "--portal-accent": portal.accent } as CSSProperties}
                        type="button"
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,var(--portal-accent),transparent_40%)] opacity-80 transition duration-500 group-hover:opacity-100" />
                        <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--portal-accent),transparent)]" />

                        <div className="relative z-10">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[color:rgba(255,236,229,0.46)]">
                            {portal.meta}
                          </p>
                          <p
                            className="mt-2 text-[clamp(1.45rem,2.6vw,2.2rem)] font-semibold tracking-[-0.06em] text-white"
                            style={{ fontFamily: "var(--font-heading), serif" }}
                          >
                            {portal.label}
                          </p>
                        </div>

                        <div className="relative z-10 flex size-12 items-center justify-center rounded-full border border-[color:rgba(255,255,255,0.12)] bg-[color:rgba(255,255,255,0.06)] text-xl text-white/84 transition duration-500 group-hover:translate-x-1">
                          →
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-[3.25vh] z-[3] flex justify-center px-6">
              <p className="text-center text-[11px] uppercase tracking-[0.28em] text-[color:rgba(255,235,226,0.34)]">
                {currentPortal
                  ? currentPortal.meta
                  : scrollProgress < 0.2
                    ? "deslice"
                    : "pase el cursor y entre"}
              </p>
            </div>

            {transitioningPortal ? <div className="landing-transition-wash absolute inset-0" /> : null}
          </div>
        </div>
      </section>
    </main>
  );
}
