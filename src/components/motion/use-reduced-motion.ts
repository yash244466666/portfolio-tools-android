import { useEffect, useState } from "react"

const query = "(prefers-reduced-motion: reduce)"

/**
 * True when the platform asks for reduced motion, or when the environment has
 * no matchMedia at all (jsdom tests). CSS transitions are already neutralized
 * globally; this hook lets JS-driven effects (coin/dice reveals) do the same.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const media = window.matchMedia(query)
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches)
    media.addEventListener("change", listener)
    return () => media.removeEventListener("change", listener)
  }, [])

  return reduced
}
