"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";

type BlurTextRevealProps = {
  animateBy?: "letters" | "words";
  className?: string;
  delay?: number;
  direction?: "bottom" | "top";
  onAnimationComplete?: () => void;
  text: string;
};

export function BlurTextReveal({
  animateBy = "letters",
  className,
  delay = 0.04,
  direction = "top",
  onAnimationComplete,
  text,
}: BlurTextRevealProps) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const [isReady, setIsReady] = useState(false);

  const segments = useMemo(
    () => (animateBy === "words" ? text.split(" ") : text.split("")),
    [animateBy, text],
  );

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const mediaQuery = globalThis.matchMedia("(prefers-reduced-motion: reduce)");

    if (mediaQuery.matches) {
      setIsReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        observer.disconnect();
        setIsReady(true);
      },
      { threshold: 0.35, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = rootRef.current;

    if (!root || !isReady) {
      return;
    }

    const chars = root.querySelectorAll<HTMLElement>("[data-blur-fragment]");

    if (chars.length === 0) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        {
          filter: "blur(10px)",
          opacity: 0,
          y: direction === "top" ? -26 : 26,
        },
        {
          delay: 0.08,
          duration: 0.72,
          ease: "power3.out",
          filter: "blur(0px)",
          opacity: 1,
          onComplete: onAnimationComplete,
          stagger: delay,
          y: 0,
        },
      );
    }, root);

    return () => ctx.revert();
  }, [delay, direction, isReady, onAnimationComplete]);

  return (
    <span className={className} ref={rootRef}>
      {segments.map((segment, index) => (
        <span data-blur-fragment key={`${segment}-${index}`} style={{ display: "inline-block", willChange: "transform, filter, opacity" }}>
          {segment === " " ? "\u00A0" : segment}
          {animateBy === "words" && index < segments.length - 1 ? "\u00A0" : null}
        </span>
      ))}
    </span>
  );
}
