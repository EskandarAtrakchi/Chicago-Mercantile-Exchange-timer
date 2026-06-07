"use client"

import type { TimelineSegment } from "@/lib/cme-session"

interface SessionTimelineProps {
  segments: TimelineSegment[]
  /** Current position 0..1 across the day in the display zone. */
  nowPct: number
  labelZone: string
}

const KIND_CLASS: Record<TimelineSegment["kind"], string> = {
  open: "bg-success",
  break: "bg-warning",
  closed: "bg-destructive/60",
}

export function SessionTimeline({ segments, nowPct, labelZone }: SessionTimelineProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>Today&apos;s session ({labelZone})</span>
        <div className="flex items-center gap-3">
          <Legend className="bg-success" label="Open" />
          <Legend className="bg-warning" label="Break" />
        </div>
      </div>
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
        {segments.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-y-0 ${KIND_CLASS[s.kind]}`}
            style={{ left: `${s.leftPct}%`, width: `${s.widthPct}%` }}
          />
        ))}
        {/* Now marker */}
        <div
          className="absolute inset-y-[-3px] w-0.5 rounded-full bg-foreground shadow-[0_0_0_2px_var(--background)]"
          style={{ left: `${Math.min(100, Math.max(0, nowPct))}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        <span>00:00</span>
        <span>06:00</span>
        <span>12:00</span>
        <span>18:00</span>
        <span>24:00</span>
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  )
}
