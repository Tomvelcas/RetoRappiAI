"use client";

import React, { useEffect, useState } from "react";

import { BlurTextReveal } from "@/components/ui/blur-text-reveal";

interface CosmicParallaxBgProps {
  head: string;
  text: string;
  loop?: boolean;
  className?: string;
}

const CosmicParallaxBg: React.FC<CosmicParallaxBgProps> = ({
  head,
  text,
  loop = true,
  className = "",
}) => {
  const [smallStars, setSmallStars] = useState<string>("");
  const [mediumStars, setMediumStars] = useState<string>("");
  const [bigStars, setBigStars] = useState<string>("");

  const textParts = text.split(",").map((part) => part.trim());

  const generateStarBoxShadow = (count: number): string => {
    const shadows: string[] = [];

    for (let index = 0; index < count; index += 1) {
      const x = Math.floor(Math.random() * 2000);
      const y = Math.floor(Math.random() * 2000);
      shadows.push(`${x}px ${y}px #FFF`);
    }

    return shadows.join(", ");
  };

  useEffect(() => {
    setSmallStars(generateStarBoxShadow(700));
    setMediumStars(generateStarBoxShadow(200));
    setBigStars(generateStarBoxShadow(100));

    document.documentElement.style.setProperty("--animation-iteration", loop ? "infinite" : "1");

    return () => {
      document.documentElement.style.setProperty("--animation-iteration", "infinite");
    };
  }, [loop]);

  return (
    <div className={`cosmic-parallax-container ${className}`.trim()}>
      <div className="cosmic-stars" id="stars" style={{ boxShadow: smallStars }} />
      <div className="cosmic-stars-medium" id="stars2" style={{ boxShadow: mediumStars }} />
      <div className="cosmic-stars-large" id="stars3" style={{ boxShadow: bigStars }} />

      <div id="horizon">
        <div className="glow" />
      </div>
      <div id="earth" />

      <div id="title">
        <BlurTextReveal text={head} />
      </div>
      <div id="subtitle">
        {textParts.map((part, index) => (
          <React.Fragment key={index}>
            <span className={`subtitle-part-${index + 1}`}>
              <BlurTextReveal animateBy="words" delay={0.12} text={part.toUpperCase()} />
            </span>
            {index < textParts.length - 1 && " "}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export { CosmicParallaxBg };
