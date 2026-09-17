"use client";

import { useEffect, useId, useRef } from "react";

interface HealthGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#34d399"; // emerald
  if (score >= 60) return "#6366f1"; // indigo
  if (score >= 40) return "#fbbf24"; // amber
  return "#f43f5e"; // rose
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "At Risk";
  return "Critical";
}

export function HealthGauge({ score, size = 180, label = "Health Score" }: HealthGaugeProps) {
  const id = useId();
  const arcRef = useRef<SVGCircleElement>(null);

  const cx = size / 2;
  const cy = size / 2;
  const radius = (size / 2) * 0.78;
  const strokeWidth = size * 0.075;
  const circumference = 2 * Math.PI * radius;

  // We only use 270° of the circle (leaving a 90° gap at the bottom)
  const arcLength = circumference * 0.75;
  const offset = arcLength - (score / 100) * arcLength;

  // Rotate so the arc starts at 135° (bottom-left gap)
  const rotation = 135;
  const color = getScoreColor(score);

  useEffect(() => {
    const arc = arcRef.current;
    if (!arc) return;
    arc.style.setProperty("--gauge-full", `${arcLength}px`);
    arc.style.setProperty("--gauge-offset", `${offset}px`);
    arc.style.strokeDashoffset = `${arcLength}`;
    // Trigger animation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        arc.style.strokeDashoffset = `${offset}`;
      });
    });
  }, [score, arcLength, offset]);

  return (
    <div className="flex flex-col items-center gap-1">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          <defs>
            <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.4" />
              <stop offset="100%" stopColor={color} stopOpacity="1" />
            </linearGradient>
            <filter id={`${id}-glow`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <circle
            ref={arcRef}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={`url(#${id}-grad)`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            filter={`url(#${id}-glow)`}
            style={{
              transition: "stroke-dashoffset 1.4s cubic-bezier(0.25, 1, 0.5, 1)",
              strokeDashoffset: arcLength,
            }}
          />
        </svg>

        {/* Center content */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: size * 0.22,
              fontWeight: 900,
              color,
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {score}
          </span>
          <span
            style={{
              fontSize: size * 0.075,
              color: "#64748b",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            / 100
          </span>
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <span
          className="mt-1 inline-block rounded-full px-3 py-0.5 text-xs font-bold"
          style={{
            background: `${color}22`,
            color,
            border: `1px solid ${color}55`,
          }}
        >
          {getScoreLabel(score)}
        </span>
      </div>
    </div>
  );
}
