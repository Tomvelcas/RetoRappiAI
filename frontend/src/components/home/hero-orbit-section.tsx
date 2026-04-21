"use client";

import { CosmicParallaxBg } from "@/components/ui/parallax-cosmic-background";

type HeroOrbitSectionProps = {
  subtitle: string;
  title: string;
};

export function HeroOrbitSection({ subtitle, title }: HeroOrbitSectionProps) {
  return (
    <section className="relative h-full w-full">
      <CosmicParallaxBg className="h-full w-full" head={title} loop text={subtitle} />
    </section>
  );
}
