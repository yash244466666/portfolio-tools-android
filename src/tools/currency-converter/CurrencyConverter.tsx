import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowRightLeft, CloudOff, ExternalLink, RefreshCw, Wifi } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { currencyCatalog } from "./catalog"
import { fetchBaseRates } from "./currency-client"
import {
  currencyCount,
  currencyStorageKey,
  defaultFromCurrency,
  defaultToCurrency,
  describeFreshness,
  emptyRatesCache,
  formatConverted,
  maximumAmount,
  migrateCache,
  parseAmount,
  providerHomepage,
  providerName,
  rateBetween,
  ratesCacheTtlMs,
  upsertCacheEntry,
  type CachedBaseRates,
  type StoredRatesCache,
} from "./currency"

/**
 * Terminal failures of one fetch attempt. "Ready", "stale", and "loading" are not
 * failures — they are derived from the cache entry, the connection state, and the
 * absence of a failure, so a fetch can never desync the UI from the cache.
 */
type LoadFailure =
  | "offline"
  | "timeout"
  | "rate-limited"
  | "provider-failure"
  | "malformed"
  | "no-record"
  | "cancelled"

const failureMessages: Record<LoadFailure, string> = {
  offline:
    "Rates could not be fetched. Cached rates are shown when available; check the connection and refresh.",
  timeout: "The rate request timed out. Check the connection and try again.",
  "rate-limited":
    "The rate provider is limiting requests right now. Wait a little and try again.",
  "provider-failure": "The rate provider returned an error. Try again in a moment.",
  malformed: "The provider response could not be understood. Try again in a moment.",
  "no-record": "No rates were returned for this currency. Pick another currency to convert from.",
  cancelled: "The previous rate request was cancelled.",
}

const currencyOptions = currencyCatalog.map((entry) => (
  <option key={entry.code} value={entry.code}>
    {entry.code} — {entry.name}
  </option>
))

export default function CurrencyConverter() {
  const { preferences, network, browser } = usePlatform()
  const [loaded, setLoaded] = useState(false)
  const [from, setFrom] = useState(defaultFromCurrency)
  const [to, setTo] = useState(defaultToCurrency)
  const [amount, setAmount] = useState("1")
  const [cache, setCache] = useState<StoredRatesCache>(emptyRatesCache)
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null)
  const [connected, setConnected] = useState(true)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [status, setStatus] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  // Load the durable cache once. A corrupt payload degrades to an empty cache, never to
  // an exception or to trusting unvalidated rates.
  useEffect(() => {
    let cancelled = false
    void preferences.get<unknown>(currencyStorageKey).then((raw) => {
      if (cancelled) return
      const migrated = migrateCache(raw)
      setCache(migrated.status === "ok" ? migrated.cache : emptyRatesCache())
      setLoaded(true)
    })
    return () => {
      cancelled = true
    }
  }, [preferences])

  useEffect(() => {
    let unsubscribe: (() => void | Promise<void>) | undefined
    let active = true
    void network.current().then((state) => {
      if (active) setConnected(state.connected)
    })
    void network
      .subscribe((state) => {
        if (active) setConnected(state.connected)
      })
      .then((unsubscribeFn) => {
        unsubscribe = unsubscribeFn
      })
    return () => {
      active = false
      void unsubscribe?.()
    }
  }, [network])

  const entry: CachedBaseRates | undefined = cache.entries[from]
  const entryFresh = entry ? nowMs - entry.fetchedAtMs < ratesCacheTtlMs : false

  // One shared fetch body for the automatic refresh effect and the manual refresh button.
  // State changes happen only in async callbacks, never synchronously inside the effect.
  const runFetch = useCallback(
    (base: string, signal: AbortSignal, isStale: () => boolean) => {
      void fetchBaseRates({ base, nowMs: Date.now(), signal }).then((outcome) => {
        if (isStale() || signal.aborted) return
        if (outcome.status === "ok") {
          setNowMs(Date.now())
          setCache((current) => {
            const merged = upsertCacheEntry(current, outcome.entry)
            void preferences.set(currencyStorageKey, merged).catch(() => {
              // A failed cache write keeps the in-session rates; the next visit refetches.
            })
            return merged
          })
          setLoadFailure(null)
          setStatus(`Rates fetched from ${providerName}.`)
        } else if (outcome.status === "offline" && cache.entries[base]) {
          // Offline with a cached table: the stale table is shown, not a failure.
          setLoadFailure(null)
        } else if (outcome.status !== "cancelled") {
          setLoadFailure(outcome.status)
        }
      })
    },
    [cache, preferences],
  )

  // When the selected base has no fresh table, fetch it (online); offline, the stale
  // cached table is displayed instead. The in-flight request is cancelled by the next
  // change, and readiness is derived — the effect itself never sets state synchronously.
  useEffect(() => {
    if (!loaded || !connected) return
    if (entry && entryFresh) return
    const controller = new AbortController()
    let stale = false
    abortRef.current?.abort()
    abortRef.current = controller
    runFetch(from, controller.signal, () => stale)
    return () => {
      stale = true
      controller.abort()
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [loaded, connected, from, entry, entryFresh, runFetch])

  const amountResult = parseAmount(amount)
  const conversion = useMemo(
    () => (entry ? rateBetween(entry.quotes, entry.base, from, to) : undefined),
    [entry, from, to],
  )
  const converted = useMemo(() => {
    if (amountResult.status !== "ok" || !conversion) return null
    return formatConverted(amountResult.value * conversion.rate)
  }, [amountResult, conversion])
  const resultText = converted !== null ? `${converted} ${to}` : ""

  const pairUnavailable = entry !== undefined && conversion === undefined
  const freshness = useMemo(
    () => (entry ? describeFreshness(entry, nowMs) : undefined),
    [entry, nowMs],
  )
  const refreshing = entry !== undefined && !entryFresh && connected && loadFailure === null

  function swap() {
    setFrom(to)
    setTo(from)
  }

  function reset() {
    abortRef.current?.abort()
    setFrom(defaultFromCurrency)
    setTo(defaultToCurrency)
    setAmount("1")
    setNowMs(Date.now())
    setStatus("Currency tool reset.")
  }

  const failureMessage = loadFailure ? failureMessages[loadFailure] : undefined

  return (
    <div className="grid gap-4">
      <ToolPanel title="Convert">
        <div className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <Field
              error={
                amountResult.status === "invalid"
                  ? `Enter a number up to ${maximumAmount.toLocaleString("en-US")}.`
                  : undefined
              }
              hint="The amount stays on this device; only currency codes reach the provider."
              htmlFor="currency-amount"
              label="Amount"
            >
              <input
                aria-describedby={
                  amountResult.status === "invalid"
                    ? "currency-amount-error"
                    : "currency-amount-hint"
                }
                className="app-input font-mono"
                id="currency-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="For example 1"
                type="text"
                value={amount}
              />
            </Field>
            <Button
              aria-label="Swap currencies"
              className="min-h-12 justify-self-start sm:mb-1"
              onClick={swap}
              variant="secondary"
            >
              <ArrowRightLeft aria-hidden="true" size={18} />
              <span className="sm:hidden">Swap</span>
            </Button>
            <Field hint="Result updates as you type." htmlFor="currency-result" label="Result">
              <output
                className="app-input flex min-h-12 items-center overflow-x-auto font-mono"
                id="currency-result"
              >
                {converted !== null
                  ? `${converted} ${to}`
                  : amountResult.status === "invalid"
                    ? "—"
                    : connected && loadFailure === null
                      ? "Loading rates…"
                      : "—"}
              </output>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              hint={`${currencyCount} currencies available.`}
              htmlFor="currency-from"
              label="From"
            >
              <select
                aria-describedby="currency-from-hint"
                className="app-input"
                id="currency-from"
                onChange={(event) => setFrom(event.target.value)}
                value={from}
              >
                {currencyOptions}
              </select>
            </Field>
            <Field hint="Converted to this currency." htmlFor="currency-to" label="To">
              <select
                aria-describedby="currency-to-hint"
                className="app-input"
                id="currency-to"
                onChange={(event) => setTo(event.target.value)}
                value={to}
              >
                {currencyOptions}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              disabled={!connected}
              onClick={() => {
                abortRef.current?.abort()
                const controller = new AbortController()
                abortRef.current = controller
                runFetch(from, controller.signal, () => false)
              }}
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" size={18} /> Refresh rates
            </Button>
            <Button onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          converted !== null ? (
            <CopyButton label="Copy result" onStatus={setStatus} value={resultText} />
          ) : undefined
        }
        title="Rate details"
      >
        <div className="grid gap-3 text-sm">
          {!connected ? (
            <p className="flex items-center gap-2 text-[var(--text-secondary)]" role="status">
              <CloudOff aria-hidden="true" size={16} /> Offline — cached rates are used when
              available.
            </p>
          ) : null}
          {failureMessage && !(loadFailure === "offline" && !connected) ? (
            <p role="alert">{failureMessage}</p>
          ) : null}

          {pairUnavailable ? (
            <p role="alert">
              No rate is available for {from} to {to} in the current table. Try another currency
              pair or refresh the rates.
            </p>
          ) : null}

          {entry && conversion ? (
            <>
              <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
                1 {from} = {formatConverted(conversion.rate)} {to} · provider data date{" "}
                {conversion.date}
              </p>
              <p className="text-[var(--text-secondary)]">
                {freshness?.fresh ? "Fresh" : "Stale"} rates fetched {freshness?.fetchedLabel} from{" "}
                {providerName}. Cached for up to 24 hours; refresh for current rates.
              </p>
            </>
          ) : !entry ? (
            <p className="text-[var(--text-secondary)]">
              {connected && loadFailure === null
                ? `Fetching ${from} rates from ${providerName}…`
                : !connected
                  ? "Reconnect to the internet to fetch exchange rates."
                  : "Rates appear here once fetched."}
            </p>
          ) : null}
          {refreshing ? (
            <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
              Refreshing {from} rates from {providerName}…
            </p>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Provider and privacy">
        <div className="grid gap-3 text-sm leading-6 text-[var(--text-secondary)]">
          <p className="flex items-center gap-2">
            <Wifi aria-hidden="true" size={16} /> This tool requires internet for exchange rates.
          </p>
          <p>
            Rates come from {providerName}, a free and open-source exchange-rate API. When you
            fetch rates, only the selected base currency code (for example{" "}
            <span className="font-mono">{from}</span>) is sent to{" "}
            <span className="font-mono">api.frankfurter.dev</span>. Your amounts and conversions
            never leave this device. Rates are cached on this installation for up to 24 hours.
          </p>
          <Button
            className="justify-self-start"
            onClick={() => void browser.open(new URL(providerHomepage))}
            variant="quiet"
          >
            <ExternalLink aria-hidden="true" size={18} /> About {providerName}
          </Button>
          {status ? (
            <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>
    </div>
  )
}