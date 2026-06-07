"use client"

import { DateTime } from "luxon"
import { ZONE_META, type ZoneKey } from "@/lib/cme-session"

interface WorldClockProps {
  /** ms timestamp to render (kept in sync by parent for smooth ticking). */
  now: number
}

const ORDER: ZoneKey[] = ["DUB", "LON", "NY", "TOKYO", "UTC"]

export function WorldClock({ now }: WorldClockProps) {
  const base = DateTime.fromMillis(now)
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {ORDER.map((key) => {
        const meta = ZONE_META[key]
        const dt = base.setZone(meta.id)
        return (
          <div
            key={key}
            className="rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-center"
          >
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {meta.short}
            </div>
            <div className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {dt.toFormat("HH:mm:ss")}
            </div>
            <div className="text-[10px] text-muted-foreground">{dt.toFormat("ccc dd LLL")}</div>
          </div>
        )
      })}
    </div>
  )
}
