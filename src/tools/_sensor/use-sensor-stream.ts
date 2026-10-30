import { useEffect, useMemo, useRef, useState } from "react"
import type {
  SensorAvailability,
  SensorKind,
  SensorSample,
  SensorSession,
} from "@/platform/contracts"
import { toSafeErrorMessage } from "@/platform/errors"
import { usePlatform } from "@/platform/platform-context"

export interface SensorStreamState {
  availability: readonly SensorAvailability[] | null
  /** True while the native/web session is delivering samples. */
  streaming: boolean
  error: string
}

/**
 * Subscribes to the platform sensor service for the tools' lifetime, starts
 * only when the app is active, stops on inactive/unmount, and never samples in
 * the background. Samples are delivered through a ref so a changing callback
 * does not restart the sensor session.
 */
export function useSensorStream(
  kinds: readonly SensorKind[],
  onSample: (sample: SensorSample) => void,
): SensorStreamState {
  const { lifecycle, sensors } = usePlatform()
  const [availability, setAvailability] = useState<readonly SensorAvailability[] | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState("")
  const sampleRef = useRef(onSample)
  useEffect(() => {
    sampleRef.current = onSample
  }, [onSample])
  const kindsKey = kinds.join(",")
  const stableKinds = useMemo(() => kindsKey.split(",") as SensorKind[], [kindsKey])

  useEffect(() => {
    let cancelled = false
    let session: SensorSession | null = null
    let starting = false
    let appActive = lifecycle.current().active

    async function start() {
      if (cancelled || session !== null || starting || !appActive) return
      starting = true
      try {
        const rows = await sensors.availability()
        if (cancelled) return
        setAvailability(rows)
        const missing = stableKinds.filter(
          (kind) => !rows.some((row) => row.kind === kind && row.available),
        )
        if (missing.length > 0) {
          setError("This phone does not expose the required sensor.")
          return
        }
        const next = await sensors.start({
          kinds: stableKinds,
          onSample: (sample) => sampleRef.current(sample),
        })
        if (cancelled || !appActive) {
          await next.stop().catch(() => undefined)
          return
        }
        session = next
        setStreaming(true)
        setError("")
      } catch (startError: unknown) {
        if (!cancelled) setError(toSafeErrorMessage(startError))
      } finally {
        starting = false
      }
    }

    async function stop() {
      const current = session
      session = null
      setStreaming(false)
      if (current) await current.stop().catch(() => undefined)
    }

    void start()
    const unsubscribe = lifecycle
      .subscribe((state) => {
        appActive = state.active
        if (state.active) void start()
        else void stop()
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      void stop()
      void unsubscribe.then((remove) => remove?.()).catch(() => undefined)
    }
  }, [lifecycle, sensors, stableKinds])

  return { availability, streaming, error }
}
