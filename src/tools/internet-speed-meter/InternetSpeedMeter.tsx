import { useCallback, useEffect, useRef, useState } from "react"
import { Sparkline } from "@/components/motion/primitives"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import type { ConnectionDetails } from "@/platform/contracts"
import { toSafeErrorMessage } from "@/platform/errors"
import {
  connectionStateLabel,
  formatBitsPerSecond,
  formatBytes,
  formatLatency,
  maximumMeterSamples,
  meterIntervalMs,
  ratesFromCounters,
  transportLabel,
  type TrafficSample,
} from "./logic"
import {
  downloadTestBytes,
  latencySamples,
  runSpeedTest,
  speedTestOrigin,
  uploadTestBytes,
  type SpeedTestOutcome,
  type SpeedTestProgress,
  type SpeedTestResult,
} from "./speed-test"

type TestStatus = "idle" | "running" | "success" | "cancelled" | "error"

function testErrorMessage(outcome: SpeedTestOutcome | null): string {
  switch (outcome?.status) {
    case "offline":
      return "The device could not reach the provider. Check your connection and try again."
    case "timeout":
      return "The test timed out before a full measurement. Try again on a more stable connection."
    case "rate-limited":
      return "The provider is rate-limiting this connection. Wait a few minutes, then try again."
    case "provider-failure":
      return "The provider returned an error. Try again later."
    case "malformed":
      return "The provider response could not be validated. Nothing was recorded."
    default:
      return "The speed test could not be completed. Try again."
  }
}

function progressLabel(progress: SpeedTestProgress | null): string {
  if (progress === null) return "Starting…"
  if (progress.phase === "latency") {
    return `Measuring latency: ${progress.completed} of ${progress.total} probes.`
  }
  return `Measuring ${progress.phase}: ${formatBytes(progress.completed)} of ${formatBytes(progress.total)}.`
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[var(--text-secondary)]">{label}</dt>
      <dd className="break-words font-mono text-[var(--text)]">{value}</dd>
    </div>
  )
}

function yesNo(value: boolean | null): string {
  return value === null ? "Not reported" : value ? "Yes" : "No"
}

export default function InternetSpeedMeter() {
  const { connection, lifecycle } = usePlatform()
  const [details, setDetails] = useState<ConnectionDetails | null>(null)
  const [detailsError, setDetailsError] = useState("")
  const [trafficSupported, setTrafficSupported] = useState<boolean | null>(null)
  const [download, setDownload] = useState<number | null>(null)
  const [upload, setUpload] = useState<number | null>(null)
  const [history, setHistory] = useState<readonly number[]>([])
  const [meterError, setMeterError] = useState("")
  const [status, setStatus] = useState<TestStatus>("idle")
  const [progress, setProgress] = useState<SpeedTestProgress | null>(null)
  const [result, setResult] = useState<SpeedTestResult | null>(null)
  const [outcome, setOutcome] = useState<SpeedTestOutcome | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    let inFlight = false
    let active = lifecycle.current().active

    async function refresh() {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        const next = await connection.details()
        if (!cancelled) {
          setDetails(next)
          setDetailsError("")
        }
      } catch (error: unknown) {
        if (!cancelled) setDetailsError(toSafeErrorMessage(error))
      } finally {
        inFlight = false
      }
    }

    function start() {
      if (timer !== undefined) return
      void refresh()
      timer = setInterval(() => void refresh(), 5_000)
    }

    function stop() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
    }

    if (active) start()
    const subscription = lifecycle.subscribe((state) => {
      active = state.active
      if (active) start()
      else stop()
    })

    return () => {
      cancelled = true
      stop()
      void subscription.then((unsubscribe) => unsubscribe()).catch(() => undefined)
    }
  }, [connection, lifecycle])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setInterval> | undefined
    let inFlight = false
    let previous: TrafficSample | null = null
    let active = lifecycle.current().active

    async function tick() {
      if (cancelled || inFlight || !active) return
      inFlight = true
      try {
        const sample = await connection.traffic()
        if (cancelled) return
        if (!sample.supported) {
          setTrafficSupported(false)
          setDownload(null)
          setUpload(null)
          setMeterError("")
          stop()
          return
        }
        setTrafficSupported(true)
        const current: TrafficSample = {
          rxBytes: sample.rxBytes ?? 0,
          txBytes: sample.txBytes ?? 0,
          elapsedRealtimeMs: sample.elapsedRealtimeMs ?? 0,
        }
        if (previous !== null) {
          const rates = ratesFromCounters(previous, current)
          setDownload(rates.downloadBitsPerSecond)
          setUpload(rates.uploadBitsPerSecond)
          if (rates.downloadBitsPerSecond !== null) {
            const nextValue = rates.downloadBitsPerSecond
            setHistory((values) => [...values, nextValue].slice(-maximumMeterSamples))
          }
        }
        previous = current
        setMeterError("")
      } catch (error: unknown) {
        if (!cancelled) {
          setMeterError(toSafeErrorMessage(error))
          stop()
        }
      } finally {
        inFlight = false
      }
    }

    function start() {
      if (timer !== undefined) return
      void tick()
      timer = setInterval(() => void tick(), meterIntervalMs)
    }

    function stop() {
      if (timer !== undefined) {
        clearInterval(timer)
        timer = undefined
      }
      previous = null
    }

    if (active) start()
    const subscription = lifecycle.subscribe((state) => {
      active = state.active
      if (active) {
        setHistory([])
        setDownload(null)
        setUpload(null)
        start()
      } else {
        stop()
        setDownload(null)
        setUpload(null)
      }
    })

    return () => {
      cancelled = true
      stop()
      void subscription.then((unsubscribe) => unsubscribe()).catch(() => undefined)
    }
  }, [connection, lifecycle])

  useEffect(() => {
    const subscription = lifecycle.subscribe((state) => {
      if (!state.active) abortRef.current?.abort()
    })
    return () => {
      abortRef.current?.abort()
      void subscription.then((unsubscribe) => unsubscribe()).catch(() => undefined)
    }
  }, [lifecycle])

  const startTest = useCallback(async () => {
    if (abortRef.current !== null) return
    const controller = new AbortController()
    abortRef.current = controller
    setStatus("running")
    setProgress({ phase: "latency", completed: 0, total: latencySamples })
    setResult(null)
    setOutcome(null)

    const next = await runSpeedTest({
      signal: controller.signal,
      onProgress: setProgress,
    })
    abortRef.current = null
    if (next.status === "ok") {
      setResult(next.result)
      setStatus("success")
      return
    }
    if (next.status === "cancelled") {
      setStatus("cancelled")
      return
    }
    setOutcome(next)
    setStatus("error")
  }, [])

  const cancelTest = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const meteredWarning = details?.metered === true

  return (
    <div className="grid gap-4">
      <ToolPanel title="Live connection">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Download</h3>
              <output className="font-mono text-3xl font-semibold" id="speed-meter-download">
                {formatBitsPerSecond(download)}
              </output>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-secondary)]">Upload</h3>
              <output className="font-mono text-3xl font-semibold" id="speed-meter-upload">
                {formatBitsPerSecond(upload)}
              </output>
            </div>
          </div>

          {trafficSupported === false ? (
            <p className="text-sm text-[var(--text-secondary)]">
              Live traffic counters are not available in this browser. The installed Android app
              samples device-wide counters without a new permission.
            </p>
          ) : (
            <Sparkline label="Recent download rate" values={history} />
          )}

          <p aria-live="polite" className="text-sm text-[var(--text-secondary)]">
            {connectionStateLabel(details)}
            {meterError ? ` ${meterError}` : ""}
          </p>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Connection" value={details ? transportLabel(details.transport) : "—"} />
            <Detail label="Internet validated" value={yesNo(details?.validated ?? null)} />
            <Detail label="Metered" value={yesNo(details?.metered ?? null)} />
            <Detail label="VPN" value={yesNo(details?.vpn ?? null)} />
            <Detail
              label="OS link estimate"
              value={
                details?.linkDownKbps
                  ? `${formatBitsPerSecond(details.linkDownKbps * 1000)} down / ${
                      details.linkUpKbps
                        ? formatBitsPerSecond(details.linkUpKbps * 1000)
                        : "not reported"
                    } up`
                  : "Not reported"
              }
            />
            <Detail
              label="Signal"
              value={
                details?.signalStrength == null ? "Not reported" : `${details.signalStrength} dBm`
              }
            />
            <Detail label="Interface" value={details?.interfaceName ?? "Not reported"} />
            <Detail label="MTU" value={details?.mtu == null ? "Not reported" : `${details.mtu}`} />
            <Detail
              label="Local addresses"
              value={
                details && details.localAddresses.length > 0
                  ? details.localAddresses.join(", ")
                  : "Not reported"
              }
            />
            <Detail
              label="DNS servers"
              value={
                details && details.dnsServers.length > 0
                  ? details.dnsServers.join(", ")
                  : "Not reported"
              }
            />
          </dl>

          {detailsError ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {detailsError}
            </p>
          ) : null}

          <p className="text-xs leading-5 text-[var(--text-secondary)]">
            Rates are calculated from device-wide Android traffic counters, so they include every
            app, not only this one. The operating-system link estimate is not a measured speed.
            Counters may reset after a reboot or network change and then show “—” until the next
            sample. Nothing is saved or logged.
          </p>
        </div>
      </ToolPanel>

      <ToolPanel title="Speed test (contacts Cloudflare)">
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            This test sends up to {formatBytes(downloadTestBytes)} down and{" "}
            {formatBytes(uploadTestBytes)} up to {speedTestOrigin.replace("https://", "")}.
            Cloudflare sees your IP address and ordinary connection metadata. It uses mobile data on
            a metered connection and takes up to 40 seconds. Results are session-only and nothing is
            saved or logged.
          </p>

          {meteredWarning ? (
            <p className="text-sm font-semibold text-[var(--danger-text)]" role="status">
              This connection is metered. The test will consume mobile data.
            </p>
          ) : null}

          {status === "running" ? (
            <div className="grid gap-3">
              <p aria-live="polite" className="text-sm">
                {progressLabel(progress)}
              </p>
              <Button onClick={cancelTest} variant="secondary">
                Cancel speed test
              </Button>
            </div>
          ) : (
            <div>
              <Button onClick={() => void startTest()}>
                {status === "idle" ? "Start speed test" : "Run speed test again"}
              </Button>
            </div>
          )}

          <div aria-live="polite" className="grid gap-3">
            {status === "success" && result ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Detail label="Latency (median)" value={formatLatency(result.latencyMs)} />
                <Detail label="Jitter" value={formatLatency(result.jitterMs)} />
                <Detail
                  label="Download"
                  value={`${formatBitsPerSecond(result.downloadMbps * 1_000_000)}`}
                />
                <Detail
                  label="Upload"
                  value={`${formatBitsPerSecond(result.uploadMbps * 1_000_000)}`}
                />
                <Detail
                  label="Data used"
                  value={formatBytes(result.downloadBytes + result.uploadBytes)}
                />
                <Detail label="Cloudflare edge" value={result.edgeLocation ?? "Not reported"} />
                {!result.downloadComplete ? (
                  <p className="col-span-2 text-sm text-[var(--text-secondary)]">
                    The download phase hit its time budget after {formatBytes(result.downloadBytes)}
                    ; the download figure is a partial measurement.
                  </p>
                ) : null}
              </dl>
            ) : null}
            {status === "cancelled" ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Speed test cancelled. Nothing was saved.
              </p>
            ) : null}
            {status === "error" ? (
              <p className="text-sm text-[var(--danger-text)]" role="alert">
                {testErrorMessage(outcome)}
              </p>
            ) : null}
          </div>
        </div>
      </ToolPanel>
    </div>
  )
}
