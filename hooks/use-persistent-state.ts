"use client"

import { useCallback, useEffect, useState } from "react"

/** Persist a small UI preference to localStorage with SSR-safe hydration. */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw !== null) setValue(JSON.parse(raw) as T)
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [key])

  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // ignore
      }
    },
    [key],
  )

  return [value, set, hydrated] as const
}
