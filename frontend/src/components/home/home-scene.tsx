"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";

import { HeroOrbitSection } from "@/components/home/hero-orbit-section";
import { NavigationChoicePanel } from "@/components/home/navigation-choice-panel";

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
    className: "left-[-3%] top-[14%] hidden md:block w-36 lg:w-44",
    depth: 0.34,
    glow: "rgba(255,166,112,0.12)",
    height: 1024,
    src: "/obj2.png",
    width: 1536,
  },
  {
    className: "left-[4%] bottom-[10%] hidden lg:block w-42",
    depth: 0.76,
    glow: "rgba(255,140,72,0.12)",
    height: 1365,
    src: "/obj5.png",
    width: 2048,
  },
  {
    className: "right-[2%] top-[14%] hidden lg:block w-40",
    depth: 0.48,
    glow: "rgba(255,190,124,0.1)",
    height: 1024,
    src: "/obj3.png",
    width: 1536,
  },
  {
    className: "right-[-2%] bottom-[2%] hidden xl:block w-[18rem]",
    depth: 0.95,
    glow: "rgba(255,118,62,0.11)",
    height: 1536,
    src: "/obj6.png",
    width: 1024,
  },
  {
    className: "left-[30%] top-[7%] hidden lg:block w-28",
    depth: 0.58,
    glow: "rgba(255,206,134,0.1)",
    height: 2000,
    src: "/obj4.webp",
    width: 2000,
  },
  {
    className: "left-[20%] bottom-[6%] hidden lg:block w-32 lg:w-40",
    depth: 0.88,
    glow: "rgba(255,146,84,0.1)",
    height: 1024,
    src: "/pj1.png",
    width: 1536,
  },
  {
    className: "right-[12%] top-[8%] hidden md:block w-32 lg:w-40",
    depth: 0.72,
    glow: "rgba(255,146,84,0.1)",
    height: 1024,
    src: "/pj2.png",
    width: 1536,
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

export function HomeScene({ locale }: HomeSceneProps) {
  const copy = HOME_COPY[locale];
  const journeyRef = useRef<HTMLElement>(null);
  const heroLayerRef = useRef<HTMLDivElement>(null);
  const choicesSectionRef = useRef<HTMLElement>(null);
  const ctaStageRef = useRef<HTMLDivElement>(null);
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

    if (!journey || !heroLayer || !choicesSection || !ctaStage) {
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

      gsap.set(ctaStage, {
        autoAlpha: 0.1,
        rotateX: 12,
        scale: 0.94,
        transformOrigin: "center top",
        yPercent: 16,
      });

      ctaAssets.forEach((object, index) => {
        const drift = 14 + index * 4;
        gsap.to(object, {
          duration: 4.4 + index * 0.45,
          ease: "sine.inOut",
          repeat: -1,
          x: index % 2 === 0 ? drift * 0.55 : drift * -0.45,
          y: index % 2 === 0 ? -drift : drift * 0.7,
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
            autoAlpha: 0.08,
            filter: "blur(14px)",
            scale: 0.86,
            yPercent: -18,
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
            autoAlpha: 1,
            rotateX: 0,
            scale: 1,
            yPercent: 0,
          },
          0.32,
        );

      gsap.to(ctaAssets, {
        rotate: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * (index % 2 === 0 ? -9 : 9);
        },
        xPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * (index % 2 === 0 ? -10 : 10);
        },
        yPercent: (index, target) => {
          const depth = Number((target as HTMLElement).dataset.ctaDepth ?? "1");
          return depth * -14;
        },
        scrollTrigger: {
          scrub: 1.15,
          start: "top bottom",
          end: "bottom top",
          trigger: choicesSection,
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
              toggleActions: "play none none reverse",
              trigger: choicesSection,
            },
          },
        );
      }
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
    </main>
  );
}
