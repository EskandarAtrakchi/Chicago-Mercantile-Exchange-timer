"use client"

import { cn } from "@/lib/utils"

interface ProgressRingProps {
  /** 0..1 */
  progress: number
  countdown: string
  hint: string
  state: "OPEN" | "BREAK" | "CLOSED"
}

const STATE_COLOR: Record<ProgressRingProps["state"], string> = {
  OPEN: "var(--success)",
  BREAK: "var(--warning)",
  CLOSED: "var(--destructive)",
}

export function ProgressRing({ progress, countdown, hint, state }: ProgressRingProps) {
  const r = 54
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <div className="relative mx-auto aspect-square w-44 sm:w-48">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} className="stroke-border" strokeWidth="8" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          stroke={STATE_COLOR[state]}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-linear"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div
            className={cn(
              "font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
              "text-foreground",
            )}
          >
            {countdown}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
    </div>
  )
}
