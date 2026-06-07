"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DateTime } from "luxon"
import {
  Bell,
  BellRing,
  Check,
  Copy,
  Monitor,
  Moon,
  Sun,
  TriangleAlert,
} from "lucide-react"
import {
  ZONE_META,
  ZONES,
  type ZoneId,
  type ZoneKey,
  countdownTo,
  getSchedule,
  getSession,
  getTodayTimeline,
} from "@/lib/cme-session"
import { usePersistentState } from "@/hooks/use-persistent-state"
import { ProgressRing } from "@/components/progress-ring"
import { SessionTimeline } from "@/components/session-timeline"
import { WorldClock } from "@/components/world-clock"
import { cn } from "@/lib/utils"

const ZONE_ORDER: ZoneKey[] = ["DUB", "LON", "NY", "TOKYO", "UTC"]

const STATE_STYLES = {
  OPEN: {
    badge: "bg-success/15 text-success border-success/30",
    dot: "bg-success",
    label: "Market Open",
  },
  BREAK: {
    badge: "bg-warning/15 text-warning border-warning/30",
    dot: "bg-warning",
    label: "Daily Break",
  },
  CLOSED: {
    badge: "bg-destructive/15 text-destructive border-destructive/30",
    dot: "bg-destructive",
    label: "Weekend Closed",
  },
} as const

type Theme = "dark" | "light"

export function CmeCountdown() {
  const [zoneKey, setZoneKey, zoneHydrated] = usePersistentState<ZoneKey>("cme.tz", "DUB")
  const [theme, setTheme, themeHydrated] = usePersistentState<Theme>("cme.theme", "dark")
  const [notify, setNotify] = usePersistentState<boolean>("cme.notify", false)

  const [now, setNow] = useState<number>(0)
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const lastStateRef = useRef<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayZone: ZoneId = ZONE_META[zoneKey].id

  // Apply theme to <html>.
  useEffect(() => {
    if (!themeHydrated) return
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
  }, [theme, themeHydrated])

  // Ticking clock. Initialize on mount to avoid SSR/client time mismatch.
  useEffect(() => {
    setNow(Date.now())
    setMounted(true)
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const nowNy = useMemo(() => DateTime.fromMillis(now).setZone(ZONES.NY), [now])
  const session = useMemo(() => getSession(nowNy), [nowNy])
  const countdown = useMemo(() => countdownTo(session.target, nowNy), [session.target, nowNy])
  const schedule = useMemo(() => getSchedule(displayZone, nowNy), [displayZone, nowNy])
  const timeline = useMemo(() => getTodayTimeline(displayZone, nowNy), [displayZone, nowNy])

  const targetLocal = session.target.setZone(displayZone)
  const nowLocal = DateTime.fromMillis(now).setZone(displayZone)
  const nowPct = ((nowLocal.toMillis() - nowLocal.startOf("day").toMillis()) / (24 * 3600 * 1000)) * 100

  const countdownText =
    (countdown.days > 0 ? `${countdown.days}d ` : "") +
    `${String(countdown.hours).padStart(2, "0")}:${String(countdown.minutes).padStart(2, "0")}:${String(
      countdown.seconds,
    ).padStart(2, "0")}`

  const stateStyle = STATE_STYLES[session.state]

  // Fire a notification when the state changes (a real transition occurred).
  useEffect(() => {
    const key = `${session.state}@${session.target.toMillis()}`
    if (lastStateRef.current === null) {
      lastStateRef.current = key
      return
    }
    if (lastStateRef.current !== key) {
      lastStateRef.current = key
      if (notify && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification("CME Bitcoin Futures", {
          body: `${stateStyle.label} — next: ${session.action} at ${targetLocal.toFormat("ccc HH:mm")}`,
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.state, session.target.toMillis()])

  async function toggleNotify() {
    if (notify) {
      setNotify(false)
      showToast("Alerts turned off")
      return
    }
    if (!("Notification" in window)) {
      showToast("Notifications not supported on this device")
      return
    }
    try {
      const perm =
        Notification.permission === "granted" ? "granted" : await Notification.requestPermission()
      if (perm === "granted") {
        setNotify(true)
        showToast("Alerts on — you'll be notified at each transition")
      } else {
        showToast("Notification permission denied")
      }
    } catch {
      showToast("Could not enable notifications")
    }
  }

  async function copyTarget() {
    const text = `CME BTC ${session.action} ${targetLocal.toLocaleString(DateTime.DATETIME_FULL)} (${ZONE_META[zoneKey].label})`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      showToast("Transition time copied")
      setTimeout(() => setCopied(false), 1500)
    } catch {
      showToast("Copy failed")
    }
  }

  const hydrated = mounted && zoneHydrated && themeHydrated

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* Header */}
      <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
              ₿
            </span>
            <h1 className="text-balance text-xl font-bold tracking-tight sm:text-2xl">
              CME Bitcoin Futures
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live session tracker · times in{" "}
            <span className="font-medium text-foreground">{ZONE_META[zoneKey].label}</span>
          </p>
        </div>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      {/* Timezone selector */}
      <div
        role="tablist"
        aria-label="Display timezone"
        className="mb-5 flex flex-wrap gap-1 rounded-xl border border-border bg-secondary/30 p-1"
      >
        {ZONE_ORDER.map((key) => {
          const active = key === zoneKey
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setZoneKey(key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {ZONE_META[key].short}
            </button>
          )
        })}
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {/* Status row */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              stateStyle.badge,
            )}
            aria-live="polite"
          >
            <span className={cn("h-2 w-2 rounded-full", stateStyle.dot)} />
            {stateStyle.label}
          </span>
          <span className="text-sm text-muted-foreground">
            {session.action}{" "}
            <span className="font-medium text-foreground">
              {hydrated ? targetLocal.toFormat("ccc HH:mm") : "—"}
            </span>
          </span>
        </div>

        {/* Ring + details */}
        <div className="grid items-center gap-6 sm:grid-cols-2">
          <ProgressRing
            progress={session.progress}
            countdown={hydrated ? countdownText : "--:--:--"}
            hint={`until ${session.action.toLowerCase()}`}
            state={session.state}
          />

          <div className="text-center sm:text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Next transition
            </div>
            <div className="mt-1 font-mono text-3xl font-bold tabular-nums sm:text-4xl">
              {hydrated ? targetLocal.toFormat("HH:mm") : "--:--"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {hydrated ? `${targetLocal.toFormat("cccc, dd LLL")} · ${ZONE_META[zoneKey].short}` : "—"}
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                onClick={copyTarget}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm font-medium transition-colors hover:bg-secondary"
              >
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                Copy time
              </button>
              <button
                onClick={toggleNotify}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  notify
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border bg-secondary/40 hover:bg-secondary",
                )}
                aria-pressed={notify}
              >
                {notify ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {notify ? "Alerts on" : "Alert me"}
              </button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="mt-6 border-t border-border pt-5">
          <SessionTimeline segments={timeline} nowPct={nowPct} labelZone={ZONE_META[zoneKey].short} />
        </div>
      </div>

      {/* World clock */}
      <section className="mt-5" aria-label="World clock">
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">World clock</h2>
        <WorldClock now={now} />
      </section>

      {/* Volatility note */}
      <div className="mt-5 flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Expect elevated volatility at the US cash open</p>
          <p className="mt-0.5 text-muted-foreground">
            09:30 New York ·{" "}
            {DateTime.fromObject({ hour: 9, minute: 30 }, { zone: ZONES.NY })
              .setZone(displayZone)
              .toFormat("HH:mm")}{" "}
            {ZONE_META[zoneKey].short}. Liquidity and spreads can shift sharply around this window.
          </p>
        </div>
      </div>

      {/* Schedule */}
      <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm" aria-label="Weekly schedule">
        <div className="mb-3 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">CME Globex weekly schedule</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-medium">Event</th>
                <th className="px-3 py-2 font-medium">New York (ET)</th>
                <th className="px-3 py-2 font-medium">{ZONE_META[zoneKey].short}</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.event} className="border-t border-border">
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    {row.event}
                    {row.note ? (
                      <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                        ({row.note})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-muted-foreground">{row.et}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums text-foreground">{row.local}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Computed from IANA time zones via Luxon — accurate across daylight-saving changes and
          independent of your device clock settings. Holiday closures are not reflected.
        </p>
      </section>

      {/* Toast */}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-full border border-border bg-popover px-4 py-2.5 text-sm font-medium text-popover-foreground shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
