"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

import { HeroOrbitSection } from "@/components/home/hero-orbit-section";
import { NavigationChoicePanel } from "@/components/home/navigation-choice-panel";
import { SolutionArchitectureSection } from "@/components/home/solution-architecture-section";

gsap.registerPlugin(ScrollTrigger);

type Locale = "en" | "es";

type HomeSceneProps = {
  locale: Locale;
};

const HOME_COPY = {
  en: {
    routes: [
      {
        accent: "rgba(255, 124, 58, 0.42)",
        href: "/dashboard",
        kind: "dashboard",
        label: "Dashboard",
        tone: "Visual",
      },
      {
        accent: "rgba(255, 128, 72, 0.4)",
        href: "/chat",
        kind: "chatbot",
        label: "Chatbot",
        tone: "AI",
      },
    ],
    subtitle: "Your data, in orbit.",
    title: "Orbbi",
  },
  es: {
    routes: [
      {
        accent: "rgba(255, 124, 58, 0.42)",
        href: "/dashboard",
        kind: "dashboard",
        label: "Dashboard",
        tone: "Visual",
      },
      {
        accent: "rgba(255, 128, 72, 0.4)",
        href: "/chat",
        kind: "chatbot",
        label: "Chatbot",
        tone: "IA",
      },
    ],
    subtitle: "Tus datos, en orbita.",
    title: "Orbbi",
  },
} as const;

const CTA_ASSETS = [
  {
    className: "left-[4%] top-[11%] hidden lg:block w-28 xl:w-32",
    depth: 0.24,
    glow: "rgba(255,190,118,0.12)",
    height: 1024,
    src: "/obj1.png",
    width: 1536,
  },
  {
    className: "left-[2%] bottom-[8%] hidden lg:block w-[11rem] xl:w-[13rem]",
    depth: 0.86,
    glow: "rgba(255,140,72,0.14)",
    height: 1365,
    src: "/obj5.png",
    width: 2048,
  },
  {
    className: "right-[-1%] top-[10%] hidden md:block w-[17rem] lg:w-[21rem] xl:w-[23rem]",
    depth: 0.72,
    glow: "rgba(92,177,255,0.14)",
    height: 1024,
    src: "/obj2.png",
    width: 1536,
  },
] as const;

const SOLUTION_ASSETS = [
  {
    className: "left-[5%] bottom-[6%] hidden lg:block w-[8.5rem] lg:w-40",
    depth: 0.9,
    glow: "rgba(255,146,84,0.12)",
    height: 1024,
    src: "/pj1.png",
    width: 1536,
  },
  {
    className: "right-[4%] top-[12%] hidden lg:block w-[5.5rem] lg:w-28",
    depth: 0.54,
    glow: "rgba(255,186,132,0.08)",
    height: 2000,
    src: "/obj4.webp",
    width: 2000,
  },
  {
    className: "right-[3%] bottom-[12%] hidden xl:block w-[10.5rem] 2xl:w-[13rem]",
    depth: 0.72,
    glow: "rgba(255,140,80,0.12)",
    height: 1536,
    src: "/obj6.png",
    width: 1024,
  },
] as const;

function CtaParallaxSet() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {CTA_ASSETS.map((object, index) => (
        <div
          className={`absolute ${object.className}`}
          data-cta-asset
          data-cta-depth={object.depth}
          key={object.src}
        >
          <div
            className="absolute inset-[12%] rounded-full blur-3xl"
            style={{ background: object.glow }}
          />
          <div className="home-cinematic-asset relative opacity-[0.92]">
            <Image
              alt=""
              className="h-auto w-full object-contain"
              height={object.height}
              priority={index < 2}
              src={object.src}
              width={object.width}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SolutionParallaxSet() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {SOLUTION_ASSETS.map((object) => (
        <div
          className={`absolute ${object.className}`}
          data-solution-asset
          data-solution-depth={object.depth}
          key={object.src}
        >
          <div className="absolute inset-[12%] rounded-full blur-3xl" style={{ background: object.glow }} />
          <div className="home-cinematic-asset relative opacity-[0.74]">
            <Image
              alt=""
              className="h-auto w-full object-contain"
              height={object.height}
              src={object.src}
              width={object.width}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomeScene({ locale }: HomeSceneProps) {
  const copy = HOME_COPY[locale];
  const journeyRef = useRef<HTMLElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const choicesSectionRef = useRef<HTMLElement>(null);
  const ctaStageRef = useRef<HTMLDivElement>(null);
  const solutionSectionRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    document.body.classList.add("orbbi-home-active");

    return () => {
      document.body.classList.remove("orbbi-home-active");
    };
  }, []);

  useEffect(() => {
    const mediaQuery = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(mediaQuery.matches);

    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);

    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    const journey = journeyRef.current;
    const heroLayer = heroLayerRef.current;
    const choicesSection = choicesSectionRef.current;
    const ctaStage = ctaStageRef.current;
    const solutionSection = solutionSectionRef.current;

    if (!journey || !heroLayer || !choicesSection || !ctaStage || !solutionSection) {
      return;
    }

    const ctx = gsap.context(() => {
      const earth = heroLayer.querySelector("#earth");
      const horizon = heroLayer.querySelector("#horizon");
      const stars = heroLayer.querySelector("#stars");
      const stars2 = heroLayer.querySelector("#stars2");
      const stars3 = heroLayer.querySelector("#stars3");
      const title = heroLayer.querySelector("#title");
      const subtitle = heroLayer.querySelector("#subtitle");
      const ctaAssets = gsap.utils.toArray<HTMLElement>("[data-cta-asset]", choicesSection);
      const choiceCards = gsap.utils.toArray<HTMLElement>("[data-home-choice-card]", choicesSection);
      const solutionAssets = gsap.utils.toArray<HTMLElement>("[data-solution-asset]", solutionSection);
      const solutionCards = gsap.utils.toArray<HTMLElement>("[data-solution-card]", solutionSection);
      const solutionStages = gsap.utils.toArray<HTMLElement>("[data-solution-stage]", solutionSection);

      gsap.set(ctaStage, {
        autoAlpha: 1,
        rotateX: 12,
        scale: 0.94,
        transformOrigin: "center top",
        yPercent: 16,
      });

      ctaAssets.forEach((object, index) => {
        const drift = 14 + index * 5;
        gsap.to(object, {
          duration: 4.8 + index * 0.5,
          ease: "sine.inOut",
          repeat: -1,
          rotate: index % 2 === 0 ? -2.8 : 2.8,
          x: index % 2 === 0 ? drift * 0.6 : drift * -0.5,
          y: index % 2 === 0 ? -drift : drift * 0.76,
          yoyo: true,
        });
      });

      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          scrub: 1.55,
          start: "top top",
          end: "bottom bottom",
          trigger: journey,
        },
      });

      timeline
        .to(
          title,
          {
            autoAlpha: 0.36,
            filter: "blur(6px)",
            scale: 0.92,
            yPercent: 56,
          },
          0,
        )
        .to(
          subtitle,
          {
            autoAlpha: 0,
            filter: "blur(6px)",
            yPercent: 10,
          },
          0.04,
        )
        .to(
          stars,
          {
            yPercent: -10,
          },
          0,
        )
        .to(
          stars2,
          {
            yPercent: -18,
          },
          0,
        )
        .to(
          stars3,
          {
            yPercent: -28,
          },
          0,
        )
        .to(
          [earth, horizon],
          {
            scale: 1.19,
            yPercent: 22,
          },
          0,
        )
        .to(
          heroLayer,
          {
            filter: "blur(1.5px)",
          },
          0.24,
        )
        .to(
          ctaStage,
          {
            rotateX: 0,
            scale: 1,
            yPercent: 0,
          },
          0.28,
        );

      gsap.to(ctaAssets, {
        rotate: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * (index % 2 === 0 ? -12 : 12);
        },
        xPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * (index % 2 === 0 ? -14 : 14);
        },
        yPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * -18;
        },
        scrollTrigger: {
          scrub: 1.2,
          start: "top bottom",
          end: "bottom top",
          trigger: choicesSection,
        },
      });

      solutionAssets.forEach((asset, index) => {
        const drift = 12 + index * 5;

        gsap.to(asset, {
          duration: 5.2 + index * 0.65,
          ease: "sine.inOut",
          repeat: -1,
          rotate: index % 2 === 0 ? 3.8 : -3.8,
          x: index % 2 === 0 ? drift * 0.42 : drift * -0.38,
          y: index % 2 === 0 ? -drift : drift * 0.62,
          yoyo: true,
        });
      });

      gsap.to(solutionAssets, {
        xPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.solutionDepth ?? "1");
          return depth * (index % 2 === 0 ? -8 : 8);
        },
        yPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.solutionDepth ?? "1");
          return depth * -12;
        },
        scrollTrigger: {
          scrub: 1,
          start: "top bottom",
          end: "bottom top",
          trigger: solutionSection,
        },
      });

      if (choiceCards.length > 0) {
        gsap.fromTo(
          choiceCards,
          {
            autoAlpha: 0,
            rotateX: 10,
            scale: 0.94,
            y: 72,
          },
          {
            autoAlpha: 1,
            duration: 1.05,
            ease: "power3.out",
            rotateX: 0,
            scale: 1,
            stagger: 0.12,
            y: 0,
            scrollTrigger: {
              start: "top 76%",
              toggleActions: "play none none none",
              trigger: choicesSection,
            },
          },
        );
      }

      if (solutionCards.length > 0) {
        gsap.fromTo(
          solutionCards,
          {
            autoAlpha: 0,
            scale: 0.96,
            y: 40,
          },
          {
            autoAlpha: 1,
            duration: 0.92,
            ease: "power3.out",
            scale: 1,
            stagger: 0.08,
            y: 0,
            scrollTrigger: {
              start: "top 72%",
              toggleActions: "play none none reverse",
              trigger: solutionSection,
            },
          },
        );
      }

      if (solutionStages.length > 0) {
        gsap.fromTo(
          solutionStages,
          {
            autoAlpha: 0,
            x: -16,
          },
          {
            autoAlpha: 1,
            duration: 0.7,
            ease: "power2.out",
            stagger: 0.06,
            x: 0,
            scrollTrigger: {
              start: "top 76%",
              toggleActions: "play none none reverse",
              trigger: solutionSection,
            },
          },
        );
      }

      gsap.to(ctaStage, {
        autoAlpha: 1,
        scale: 0.985,
        yPercent: -6,
        scrollTrigger: {
          scrub: 1.15,
          start: "top bottom",
          end: "top 34%",
          trigger: solutionSection,
        },
      });

      if (choiceCards.length > 0) {
        gsap.to(choiceCards, {
          rotateX: -5,
          scale: 0.985,
          yPercent: -4,
          scrollTrigger: {
            scrub: 1.05,
            start: "top bottom",
            end: "top 36%",
            trigger: solutionSection,
          },
        });
      }

      gsap.fromTo(
        solutionSection,
        {
          autoAlpha: 0.82,
          y: 84,
        },
        {
          autoAlpha: 1,
          ease: "none",
          y: 0,
          scrollTrigger: {
            scrub: 1.15,
            start: "top bottom",
            end: "top 30%",
            trigger: solutionSection,
          },
        },
      );
    }, journey);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <main className="relative z-10 overflow-x-clip bg-[#090a0f] text-white" lang={locale}>
      <section
        className={reducedMotion ? "relative min-h-dvh" : "relative h-[205svh]"}
        ref={journeyRef}
      >
        <div className={reducedMotion ? "relative min-h-dvh overflow-hidden" : "sticky top-0 h-dvh overflow-hidden"}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,#090a0f_0%,#100907_100%)]" />

          <div className="relative h-full w-full" ref={heroLayerRef}>
            <HeroOrbitSection subtitle={copy.subtitle} title={copy.title} />
          </div>
        </div>
      </section>

      <section
        className="relative z-20 -mt-[28svh] flex min-h-dvh items-center overflow-hidden bg-[linear-gradient(180deg,rgba(9,10,15,0)_0%,rgba(9,10,15,0.72)_10%,rgba(9,10,15,0.96)_24%,#090a0f_38%,#090909_100%)] px-5 pb-14 pt-[28svh] sm:px-8 sm:pb-20 sm:pt-[24svh] lg:px-10 lg:pb-24 lg:pt-[20svh]"
        id="entry-choices"
        ref={choicesSectionRef}
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[48svh] bg-[linear-gradient(180deg,rgba(255,185,145,0.09)_0%,rgba(255,121,67,0.08)_10%,rgba(52,22,13,0.22)_24%,rgba(9,10,15,0.82)_52%,#090a0f_100%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,107,26,0.12),transparent_24%),radial-gradient(circle_at_82%_20%,rgba(255,138,86,0.1),transparent_18%),radial-gradient(circle_at_50%_0%,rgba(255,199,164,0.07),transparent_26%)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-[18%] top-[12svh] h-px bg-[linear-gradient(90deg,transparent,rgba(255,178,133,0.42),transparent)]"
        />
        <CtaParallaxSet />
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 pb-8" ref={ctaStageRef}>
          <NavigationChoicePanel routes={copy.routes} />
        </div>
        <footer className="pointer-events-none absolute inset-x-0 bottom-3 z-10 text-center text-[0.58rem] uppercase tracking-[0.28em] text-white/30 sm:bottom-4">
          Creado por Tomás Velásquez para Reto Rappi
        </footer>
      </section>

      <div className="relative" ref={solutionSectionRef}>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 z-10 h-28 bg-[linear-gradient(180deg,#090909_0%,rgba(9,9,9,0.66)_30%,rgba(255,247,241,0)_100%)]"
        />
        <SolutionParallaxSet />
        <SolutionArchitectureSection locale={locale} />
      </div>
    </main>
  );
}
