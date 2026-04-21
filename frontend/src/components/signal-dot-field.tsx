"use client";

import { useEffect, useRef } from "react";

import { secureRandom } from "@/lib/secure-random";

type SignalDotFieldProps = {
  className?: string;
  density?: number;
  color?: string;
};

export function SignalDotField({
  className,
  density = 28,
  color = "rgba(34, 27, 23, 0.18)",
}: SignalDotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const parent = canvas.parentElement;
    if (!parent) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: 0, y: 0 };
    let frameId = 0;

    const dots: Array<{ x: number; y: number; phase: number; size: number }> = [];

    const rebuildDots = () => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.8);

      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      dots.length = 0;
      for (let y = density * 0.5; y < height + density; y += density) {
        for (let x = density * 0.5; x < width + density; x += density) {
          dots.push({
            x,
            y,
            phase: secureRandom() * Math.PI * 2,
            size: secureRandom() * 1.1 + 0.55,
          });
        }
      }
    };

    const draw = (timestamp: number) => {
      const width = parent.clientWidth;
      const height = parent.clientHeight;

      context.clearRect(0, 0, width, height);
      context.fillStyle = color;

      for (const dot of dots) {
        const driftX = prefersReducedMotion
          ? 0
          : Math.cos(timestamp * 0.0004 + dot.phase) * 1.6 + pointer.x * 8;
        const driftY = prefersReducedMotion
          ? 0
          : Math.sin(timestamp * 0.00045 + dot.phase) * 1.6 + pointer.y * 8;

        context.beginPath();
        context.arc(dot.x + driftX, dot.y + driftY, dot.size, 0, Math.PI * 2);
        context.fill();
      }

      if (!prefersReducedMotion) {
        frameId = window.requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.5;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.5;
    };

    const handlePointerLeave = () => {
      pointer.x = 0;
      pointer.y = 0;
    };

    const resizeObserver = new ResizeObserver(() => {
      rebuildDots();
      if (prefersReducedMotion) {
        draw(performance.now());
      }
    });

    resizeObserver.observe(parent);
    rebuildDots();
    draw(performance.now());

    parent.addEventListener("pointermove", handlePointerMove);
    parent.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      resizeObserver.disconnect();
      parent.removeEventListener("pointermove", handlePointerMove);
      parent.removeEventListener("pointerleave", handlePointerLeave);
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [color, density]);

  return <canvas className={className} ref={canvasRef} />;
}
