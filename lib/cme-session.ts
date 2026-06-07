import { DateTime } from "luxon"

/**
 * CME Globex trading-session logic for CME Bitcoin Futures (BTC).
 *
 * Schedule (all anchored to America/New_York / "ET"):
 *  - Sunday 18:00 ET  -> market opens for the week
 *  - Each weekday: 60-minute maintenance break 17:00 -> 18:00 ET
 *  - Friday 17:00 ET  -> market closes for the weekend
 *
 * Everything is computed in ET first (the exchange's reference zone), then
 * converted to the user's chosen display zone. This keeps the math correct
 * across DST changes in any timezone.
 */

export const ZONES = {
  DUB: "Europe/Dublin",
  NY: "America/New_York",
  TOKYO: "Asia/Tokyo",
  LON: "Europe/London",
  UTC: "UTC",
} as const

export type ZoneKey = keyof typeof ZONES
export type ZoneId = (typeof ZONES)[ZoneKey]

export const ZONE_META: Record<ZoneKey, { id: ZoneId; label: string; short: string }> = {
  DUB: { id: ZONES.DUB, label: "Dublin", short: "Dublin" },
  NY: { id: ZONES.NY, label: "New York", short: "New York" },
  LON: { id: ZONES.LON, label: "London", short: "London" },
  TOKYO: { id: ZONES.TOKYO, label: "Tokyo", short: "Tokyo" },
  UTC: { id: ZONES.UTC, label: "UTC", short: "UTC" },
}

export type SessionState = "OPEN" | "BREAK" | "CLOSED"

export interface SessionInfo {
  /** Current state of the market. */
  state: SessionState
  /** The next transition moment (in ET). */
  target: DateTime
  /** Start of the current phase (in ET) — used for progress. */
  phaseStart: DateTime
  /** Human label for what happens at the target. */
  action: "Opens" | "Reopens" | "Daily break" | "Weekend close"
  /** Fraction (0..1) of the current phase elapsed. */
  progress: number
}

const NY = ZONES.NY

function at(dt: DateTime, weekday: number, hour: number): DateTime {
  return dt.set({ weekday: weekday as 1, hour, minute: 0, second: 0, millisecond: 0 })
}

/** Compute the current session state and next transition, given "now" in ET. */
export function getSession(nowNy: DateTime): SessionInfo {
  const dailyClose = nowNy.set({ hour: 17, minute: 0, second: 0, millisecond: 0 })
  const dailyOpen = nowNy.set({ hour: 18, minute: 0, second: 0, millisecond: 0 })

  // Weekend window: Friday 17:00 ET -> Sunday 18:00 ET
  let weekendStart = at(nowNy, 5, 17) // Fri 17:00
  let weekendEnd = at(nowNy, 7, 18) // Sun 18:00
  // Normalize so the window straddles "now" correctly.
  if (weekendEnd <= weekendStart) weekendEnd = weekendEnd.plus({ days: 7 })

  const day = nowNy.weekday // 1=Mon ... 7=Sun

  // --- Weekend (closed) ---
  if (nowNy >= weekendStart && nowNy < weekendEnd) {
    return {
      state: "CLOSED",
      target: weekendEnd,
      phaseStart: weekendStart,
      action: "Reopens",
      progress: frac(weekendStart, weekendEnd, nowNy),
    }
  }

  // --- Daily maintenance break (Mon–Fri, 17:00–18:00 ET) ---
  if (day >= 1 && day <= 5 && nowNy >= dailyClose && nowNy < dailyOpen) {
    return {
      state: "BREAK",
      target: dailyOpen,
      phaseStart: dailyClose,
      action: "Reopens",
      progress: frac(dailyClose, dailyOpen, nowNy),
    }
  }

  // --- Open ---
  // Determine the next close that ends this open phase.
  let nextClose: DateTime
  let phaseStart: DateTime
  let action: SessionInfo["action"]

  if (nowNy < dailyClose) {
    // Open from previous 18:00 to today 17:00.
    nextClose = dailyClose
    phaseStart = dailyClose.minus({ days: 1 }).set({ hour: 18 })
  } else {
    // After 18:00 ET: open until next day's 17:00.
    nextClose = dailyClose.plus({ days: 1 })
    phaseStart = dailyOpen
  }

  // If the next close is Friday's, the action is a weekend close.
  const upcomingWeekendStart = at(nowNy, 5, 17) >= nowNy ? at(nowNy, 5, 17) : at(nowNy, 5, 17).plus({ days: 7 })
  if (nextClose.hasSame(upcomingWeekendStart, "day") && nextClose.weekday === 5) {
    action = "Weekend close"
  } else {
    action = "Daily break"
  }

  return {
    state: "OPEN",
    target: nextClose,
    phaseStart,
    action,
    progress: frac(phaseStart, nextClose, nowNy),
  }
}

function frac(start: DateTime, end: DateTime, now: DateTime): number {
  const total = end.diff(start).as("seconds")
  if (total <= 0) return 0
  const passed = now.diff(start).as("seconds")
  return Math.min(1, Math.max(0, passed / total))
}

export interface CountdownParts {
  days: number
  hours: number
  minutes: number
  seconds: number
  totalSeconds: number
}

export function countdownTo(target: DateTime, nowNy: DateTime): CountdownParts {
  const diff = target.diff(nowNy, ["days", "hours", "minutes", "seconds"]).toObject()
  const totalSeconds = Math.max(0, Math.floor(target.diff(nowNy).as("seconds")))
  return {
    days: Math.max(0, Math.floor(diff.days || 0)),
    hours: Math.max(0, Math.floor(diff.hours || 0)),
    minutes: Math.max(0, Math.floor(diff.minutes || 0)),
    seconds: Math.max(0, Math.floor(diff.seconds || 0)),
    totalSeconds,
  }
}

/** Weekly schedule anchors, formatted for both ET and the display zone. */
export interface ScheduleRow {
  event: string
  et: string
  local: string
  note?: string
}

export function getSchedule(displayZone: ZoneId, nowNy = DateTime.now().setZone(NY)): ScheduleRow[] {
  const sundayOpen = at(nowNy, 7, 18)
  const fridayClose = at(nowNy, 5, 17)
  const breakStart = nowNy.set({ hour: 17, minute: 0, second: 0, millisecond: 0 })
  const breakEnd = nowNy.set({ hour: 18, minute: 0, second: 0, millisecond: 0 })

  return [
    {
      event: "Weekly open",
      et: sundayOpen.toFormat("ccc HH:mm"),
      local: sundayOpen.setZone(displayZone).toFormat("ccc HH:mm"),
    },
    {
      event: "Daily break",
      et: `${breakStart.toFormat("HH:mm")}–${breakEnd.toFormat("HH:mm")}`,
      local: `${breakStart.setZone(displayZone).toFormat("HH:mm")}–${breakEnd
        .setZone(displayZone)
        .toFormat("HH:mm")}`,
      note: "Mon–Fri",
    },
    {
      event: "Weekly close",
      et: fridayClose.toFormat("ccc HH:mm"),
      local: fridayClose.setZone(displayZone).toFormat("ccc HH:mm"),
    },
  ]
}

/** Build a 24h timeline (in the display zone) of open/break segments for "today". */
export interface TimelineSegment {
  leftPct: number
  widthPct: number
  kind: "open" | "break" | "closed"
}

export function getTodayTimeline(displayZone: ZoneId, nowNy = DateTime.now().setZone(NY)): TimelineSegment[] {
  const start = nowNy.setZone(displayZone).startOf("day")
  const end = start.plus({ hours: 24 })
  const totalMs = end.toMillis() - start.toMillis()

  const breakStart = nowNy.set({ hour: 17, minute: 0, second: 0, millisecond: 0 }).setZone(displayZone)
  const breakEnd = nowNy.set({ hour: 18, minute: 0, second: 0, millisecond: 0 }).setZone(displayZone)

  const day = nowNy.weekday
  const isWeekend = day === 6 || day === 7

  if (isWeekend) {
    return [{ leftPct: 0, widthPct: 100, kind: "closed" }]
  }

  const seg = (x0: DateTime, x1: DateTime, kind: TimelineSegment["kind"]): TimelineSegment | null => {
    const left = Math.max(0, ((x0.toMillis() - start.toMillis()) / totalMs) * 100)
    const right = Math.max(0, 100 - ((x1.toMillis() - start.toMillis()) / totalMs) * 100)
    const width = 100 - left - right
    if (width <= 0) return null
    return { leftPct: left, widthPct: width, kind }
  }

  const segments: (TimelineSegment | null)[] = [
    seg(start, breakStart, "open"),
    seg(breakStart, breakEnd, "break"),
    seg(breakEnd, end, "open"),
  ]
  return segments.filter((s): s is TimelineSegment => s !== null)
}

export function nowInZone(zone: ZoneId): DateTime {
  return DateTime.now().setZone(zone)
}

export function nowEt(): DateTime {
  return DateTime.now().setZone(NY)
}
