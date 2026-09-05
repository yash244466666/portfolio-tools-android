import { useEffect, useMemo, useState } from "react"
import type { NetworkState } from "@/platform/contracts"
import { usePlatform } from "@/platform/platform-context"

export type ThemePreference = "system" | "light" | "dark"

export function useStoredStringArray(key: string) {
  const { preferences } = usePlatform()
  const [value, setValue] = useState<string[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let current = true
    void preferences
      .get<string[]>(key)
      .then((saved) => {
        if (current && Array.isArray(saved))
          setValue(saved.filter((item) => typeof item === "string"))
      })
      .finally(() => {
        if (current) setLoaded(true)
      })
    return () => {
      current = false
    }
  }, [key, preferences])

  useEffect(() => {
    if (loaded) void preferences.set(key, value)
  }, [key, loaded, preferences, value])

  return [value, setValue, loaded] as const
}

export function useThemePreference() {
  const { preferences } = usePlatform()
  const [preference, setPreference] = useState<ThemePreference>("system")
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let current = true
    void preferences
      .get<ThemePreference>("theme")
      .then((saved) => {
        if (current && (saved === "system" || saved === "light" || saved === "dark")) {
          setPreference(saved)
        }
      })
      .finally(() => {
        if (current) setLoaded(true)
      })
    return () => {
      current = false
    }
  }, [preferences])

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = () => {
      const resolved = preference === "system" ? (media.matches ? "dark" : "light") : preference
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
    }
    apply()
    media.addEventListener("change", apply)
    if (loaded) void preferences.set("theme", preference)
    return () => media.removeEventListener("change", apply)
  }, [loaded, preference, preferences])

  return [preference, setPreference] as const
}

export function useNetworkState() {
  const { network } = usePlatform()
  const [state, setState] = useState<NetworkState>({ connected: true, connectionType: "unknown" })

  useEffect(() => {
    let unsubscribe: (() => void | Promise<void>) | undefined
    let current = true
    void network.current().then((next) => {
      if (current) setState(next)
    })
    void network.subscribe(setState).then((remove) => {
      if (current) unsubscribe = remove
      else void remove()
    })
    return () => {
      current = false
      if (unsubscribe) void unsubscribe()
    }
  }, [network])

  return useMemo(() => state, [state])
}
