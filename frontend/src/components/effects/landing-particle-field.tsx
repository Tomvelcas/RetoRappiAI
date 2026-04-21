"use client";

import { useEffect, useRef } from "react";

import { secureRandom, secureRandomInt } from "@/lib/secure-random";

type LandingParticleFieldProps = Readonly<{
  activeLabel: string | null;
  mode: "copilot" | "dashboard" | "idle";
}>;

const PARTICLE_COUNT = 5200;
const REPEL_RADIUS = 112;
const REPEL_FORCE = 8.2;
const PHI = Math.PI * (1 + Math.sqrt(5));
const FOV = 560;
const CAMERA_Z = 680;
const DPR_LIMIT = 1.5;

type Palette = {
  glowInner: string;
  glowOuter: string;
  trail: string;
  wordHue: number;
  wordHueSpan: number;
};

function getPalette(mode: LandingParticleFieldProps["mode"]): Palette {
  if (mode === "dashboard") {
    return {
      glowInner: "rgba(46, 219, 223, 0.18)",
      glowOuter: "rgba(11, 73, 84, 0.08)",
      trail: "rgba(4, 15, 22, 0.24)",
      wordHue: 188,
      wordHueSpan: 34,
    };
  }

  if (mode === "copilot") {
    return {
      glowInner: "rgba(255, 153, 109, 0.2)",
      glowOuter: "rgba(120, 38, 88, 0.08)",
      trail: "rgba(18, 8, 18, 0.24)",
      wordHue: 336,
      wordHueSpan: 44,
    };
  }

  return {
    glowInner: "rgba(166, 110, 255, 0.15)",
    glowOuter: "rgba(25, 38, 88, 0.08)",
    trail: "rgba(7, 9, 18, 0.22)",
    wordHue: 210,
    wordHueSpan: 60,
  };
}

export function LandingParticleField({
  activeLabel,
  mode,
}: LandingParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeLabelRef = useRef<string | null>(activeLabel);
  const modeRef = useRef(mode);

  useEffect(() => {
    activeLabelRef.current = activeLabel?.trim() ? activeLabel.trim() : null;
  }, [activeLabel]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      return;
    }

    const canvasElement = canvas;
    const context = ctx;

    let width = 0;
    let height = 0;
    let centerX = 0;
    let centerY = 0;
    let dpr = 1;
    let frameId = 0;
    let currentLabel: string | null = null;
    let mouseX = -9999;
    let mouseY = -9999;
    let t = 0;
    let rotY = 0;
    let wordMode = false;

    const px = new Float32Array(PARTICLE_COUNT);
    const py = new Float32Array(PARTICLE_COUNT);
    const pz = new Float32Array(PARTICLE_COUNT);
    const vx = new Float32Array(PARTICLE_COUNT);
    const vy = new Float32Array(PARTICLE_COUNT);
    const vz = new Float32Array(PARTICLE_COUNT);
    const tx = new Float32Array(PARTICLE_COUNT);
    const ty = new Float32Array(PARTICLE_COUNT);
    const tz = new Float32Array(PARTICLE_COUNT);
    const ox = new Float32Array(PARTICLE_COUNT);
    const oy = new Float32Array(PARTICLE_COUNT);
    const oz = new Float32Array(PARTICLE_COUNT);
    const hue = new Float32Array(PARTICLE_COUNT);
    const phase = new Float32Array(PARTICLE_COUNT);

    function initSphereTargets() {
      const baseDimension = Math.min(width, height);
      const radius = baseDimension > 1200 ? baseDimension * 0.21 : baseDimension * 0.27;

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const polar = Math.acos(1 - (2 * (index + 0.5)) / PARTICLE_COUNT);
        const azimuth = PHI * index;

        ox[index] = Math.sin(polar) * Math.cos(azimuth) * radius;
        oy[index] = Math.sin(polar) * Math.sin(azimuth) * radius;
        oz[index] = Math.cos(polar) * radius;

        tx[index] = ox[index];
        ty[index] = oy[index];
        tz[index] = oz[index];
      }
    }

    function initParticles() {
      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        px[index] = (secureRandom() - 0.5) * width * 2;
        py[index] = (secureRandom() - 0.5) * height * 2;
        pz[index] = (secureRandom() - 0.5) * 1000;
        vx[index] = 0;
        vy[index] = 0;
        vz[index] = 0;
        hue[index] = (index / PARTICLE_COUNT) * 270;
        phase[index] = secureRandom() * Math.PI * 2;
      }
    }

    function resize() {
      dpr = Math.min(globalThis.devicePixelRatio || 1, DPR_LIMIT);
      width = Math.max(canvasElement.clientWidth, 1);
      height = Math.max(canvasElement.clientHeight, 1);
      centerX = width / 2;
      centerY = height / 2;

      canvasElement.width = Math.floor(width * dpr);
      canvasElement.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (wordMode && currentLabel) {
        applyLabel(currentLabel);
        return;
      }

      initSphereTargets();
    }

    function sampleTextPositions(label: string) {
      const phrase = label.toUpperCase();
      const canvasWidth = Math.floor(width);
      const canvasHeight = Math.floor(height);
      const offscreen = document.createElement("canvas");
      offscreen.width = canvasWidth;
      offscreen.height = canvasHeight;

      const offscreenContext = offscreen.getContext("2d");
      if (!offscreenContext) {
        return [];
      }

      const words = phrase.split(" ");
      const lines: string[] = [];
      let currentLine = "";
      const maxCharsPerLine = phrase.length > 12 ? 8 : 12;

      for (const word of words) {
        const nextCandidate = `${currentLine}${word}`.trim();
        if (nextCandidate.length > maxCharsPerLine && currentLine.trim()) {
          lines.push(currentLine.trim());
          currentLine = `${word} `;
        } else {
          currentLine += `${word} `;
        }
      }

      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }

      const fontSize = Math.min(
        canvasWidth * 0.72 / Math.max(maxCharsPerLine * 0.54, 1),
        canvasHeight * 0.34 / Math.max(lines.length, 1),
        168,
      );

      offscreenContext.fillStyle = "#ffffff";
      offscreenContext.font = `900 ${fontSize}px "IBM Plex Sans", system-ui, sans-serif`;
      offscreenContext.textAlign = "center";
      offscreenContext.textBaseline = "middle";

      const lineHeight = fontSize * 1.05;
      const startY = canvasHeight / 2 - ((lines.length - 1) * lineHeight) / 2;

      lines.forEach((line, lineIndex) => {
        offscreenContext.fillText(line, canvasWidth / 2, startY + lineIndex * lineHeight);
      });

      const data = offscreenContext.getImageData(0, 0, canvasWidth, canvasHeight).data;
      const points: number[] = [];
      const step = phrase.length > 10 ? 2 : 1;

      for (let y = 0; y < canvasHeight; y += step) {
        for (let x = 0; x < canvasWidth; x += step) {
          if (data[(y * canvasWidth + x) * 4 + 3] > 112) {
            points.push(
              x - canvasWidth / 2 + (secureRandom() - 0.5) * 0.8,
              y - canvasHeight / 2 + (secureRandom() - 0.5) * 0.8,
            );
          }
        }
      }

      for (let index = points.length / 2 - 1; index > 0; index -= 1) {
        const swapIndex = secureRandomInt(index + 1);
        const currentPointIndex = index * 2;
        const swapPointIndex = swapIndex * 2;
        const pointX = points[currentPointIndex];
        const pointY = points[currentPointIndex + 1];

        points[currentPointIndex] = points[swapPointIndex];
        points[currentPointIndex + 1] = points[swapPointIndex + 1];
        points[swapPointIndex] = pointX;
        points[swapPointIndex + 1] = pointY;
      }

      return points;
    }

    function applyLabel(nextLabel: string | null) {
      currentLabel = nextLabel;
      wordMode = Boolean(nextLabel);

      if (!nextLabel) {
        initSphereTargets();
        return;
      }

      const points = sampleTextPositions(nextLabel);
      const pointCount = points.length / 2;

      if (!pointCount) {
        wordMode = false;
        initSphereTargets();
        return;
      }

      rotY = 0;

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const pointIndex = (index % pointCount) * 2;
        tx[index] = points[pointIndex];
        ty[index] = points[pointIndex + 1];
        tz[index] = 0;
      }
    }

    function updateTargetsFromProps() {
      const nextLabel = activeLabelRef.current?.trim() ? activeLabelRef.current : null;

      if (nextLabel !== currentLabel) {
        applyLabel(nextLabel);
      }
    }

    function update() {
      t += 0.005;

      if (!wordMode) {
        rotY += 0.0065;
      }

      const jitter = wordMode ? 0 : 1.4;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        let targetX = tx[index] * cosY - tz[index] * sinY;
        let targetY = ty[index];
        let targetZ = tx[index] * sinY + tz[index] * cosY;

        if (!wordMode) {
          targetX += Math.sin(t * 8 + phase[index]) * jitter;
          targetY += Math.cos(t * 9 + phase[index]) * jitter;
          targetZ += Math.sin(t * 7 + phase[index] * 2) * jitter;
        }

        const attraction = wordMode ? 0.024 : 0.019;
        vx[index] += (targetX - px[index]) * attraction;
        vy[index] += (targetY - py[index]) * attraction;
        vz[index] += (targetZ - pz[index]) * attraction;

        if (mouseX > 0) {
          const scale = FOV / (FOV + pz[index] + CAMERA_Z);
          const screenX = px[index] * scale + centerX;
          const screenY = py[index] * scale + centerY;
          const deltaX = screenX - mouseX;
          const deltaY = screenY - mouseY;
          const distanceSquared = deltaX * deltaX + deltaY * deltaY;

          if (distanceSquared < REPEL_RADIUS * REPEL_RADIUS && distanceSquared > 1) {
            const distance = Math.sqrt(distanceSquared);
            const magnitude = REPEL_FORCE * (1 - distance / REPEL_RADIUS) * (wordMode ? 5.2 : 2.4);
            vx[index] += (deltaX / distance) * magnitude;
            vy[index] += (deltaY / distance) * magnitude;
          }
        }

        vx[index] *= wordMode ? 0.84 : 0.88;
        vy[index] *= wordMode ? 0.84 : 0.88;
        vz[index] *= wordMode ? 0.84 : 0.88;

        px[index] += vx[index];
        py[index] += vy[index];
        pz[index] += vz[index];
      }
    }

    function draw() {
      const palette = getPalette(modeRef.current);

      context.clearRect(0, 0, width, height);
      context.fillStyle = palette.trail;
      context.fillRect(0, 0, width, height);

      const centerGlow = context.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        Math.min(width, height) * 0.42,
      );
      centerGlow.addColorStop(0, palette.glowInner);
      centerGlow.addColorStop(1, palette.glowOuter);
      context.fillStyle = centerGlow;
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < PARTICLE_COUNT; index += 1) {
        const zPosition = pz[index] + CAMERA_Z;
        if (zPosition < 10) {
          continue;
        }

        const scale = FOV / zPosition;
        const screenX = px[index] * scale + centerX;
        const screenY = py[index] * scale + centerY;
        const speed = Math.sqrt(vx[index] * vx[index] + vy[index] * vy[index] + vz[index] * vz[index]);

        let alpha = Math.min(1, (0.18 + speed * 0.08) * scale);
        let size = (0.55 + speed * 0.12) * scale;
        let particleHue = (hue[index] + t * 35 + 190) % 360;
        let saturation = 88;
        let lightness = 72;

        if (wordMode) {
          const hueShift = Math.sin(index * 0.03 + t * 20) * palette.wordHueSpan;
          particleHue = palette.wordHue + hueShift;
          saturation = 96;
          lightness = 78 + Math.min(scale * 8, 10);
          alpha = Math.min(1, alpha * 1.75);
          size *= 0.95;
        }

        context.beginPath();
        context.arc(screenX, screenY, size, 0, Math.PI * 2);
        context.fillStyle = `hsla(${particleHue}, ${saturation}%, ${lightness}%, ${alpha})`;
        context.fill();
      }

      if (mouseX > 0) {
        const repelGlow = context.createRadialGradient(
          mouseX,
          mouseY,
          0,
          mouseX,
          mouseY,
          REPEL_RADIUS,
        );
        repelGlow.addColorStop(0, "rgba(255,255,255,0.08)");
        repelGlow.addColorStop(1, "rgba(255,255,255,0)");
        context.beginPath();
        context.arc(mouseX, mouseY, REPEL_RADIUS, 0, Math.PI * 2);
        context.fillStyle = repelGlow;
        context.fill();
      }
    }

    function loop() {
      updateTargetsFromProps();
      update();
      draw();
      frameId = globalThis.requestAnimationFrame(loop);
    }

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvasElement.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -9999;
      mouseY = -9999;
    };

    resize();
    initParticles();
    applyLabel(activeLabelRef.current);

    globalThis.addEventListener("resize", resize);
    globalThis.addEventListener("mousemove", handleMouseMove);
    globalThis.addEventListener("blur", handleMouseLeave);
    frameId = globalThis.requestAnimationFrame(loop);

    return () => {
      globalThis.cancelAnimationFrame(frameId);
      globalThis.removeEventListener("resize", resize);
      globalThis.removeEventListener("mousemove", handleMouseMove);
      globalThis.removeEventListener("blur", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      ref={canvasRef}
    />
  );
}
