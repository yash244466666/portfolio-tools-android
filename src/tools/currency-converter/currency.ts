/**
 * Pure Currency Converter model: provider request building, strict response schema
 * validation, versioned cache persistence, and conversion arithmetic.
 *
 * Frankfurter v2 is the provider (the audited upstream used v1, which the provider now
 * documents as superseded and which no longer covers 53 currencies including BDT). The
 * `/v2/rates` response is a bounded flat array (~10 KiB) in which every quote carries its
 * own `date`, so freshness is reported per conversion rather than per response.
 */

import { currencyCatalog } from "./catalog"

export const providerName = "Frankfurter"
export const providerHomepage = "https://frankfurter.dev"
export const apiOrigin = "https://api.frankfurter.dev"

/** Hard wall-clock budget for one rate request; requests are also user-cancellable. */
export const requestTimeoutMs = 15_000

/**
 * Byte cap for the provider's JSON body. The documented `/v2/rates` shape is
 * about 10 KiB; 256 KiB leaves ample room for catalog growth while keeping a
 * compromised or misconfigured provider from forcing unbounded parsing.
 */
export const maximumRatesResponseBytes = 256 * 1024

/** Aligned with the provider's advertised `max-age=86400` cache lifetime. */
export const ratesCacheTtlMs = 24 * 60 * 60 * 1000

/** Bound on cached bases so the preference payload stays small and predictable. */
export const maximumCachedBases = 8

/** Amounts are bounded so display formatting and persistence stay predictable. */
export const maximumAmount = 1_000_000_000

export const defaultFromCurrency = "USD"
export const defaultToCurrency = "EUR"

/** Durable rates cache key inside the `yash-tools:v1:` preference namespace. */
export const currencyStorageKey = "currency:rates"
export const currencySchemaVersion = 1

export const currencyCodes: readonly string[] = currencyCatalog.map((entry) => entry.code)
export const currencyCount = currencyCatalog.length

export function isValidCurrencyCode(code: string): boolean {
  return currencyCodes.includes(code)
}

export function currencyName(code: string): string {
  return currencyCatalog.find((entry) => entry.code === code)?.name ?? code
}

/**
 * Builds the HTTPS-only exact-origin rates URL. The code must already be validated
 * against the catalog by the caller; this refuses to interpolate anything else.
 */
export function buildRatesUrl(base: string): URL {
  if (!isValidCurrencyCode(base)) throw new RangeError(`Unsupported currency: ${base}`)
  return new URL(`${apiOrigin}/v2/rates?base=${encodeURIComponent(base)}`)
}

/** One cached quote: the rate and the provider data date it was effective on. */
export interface CachedQuote {
  rate: number
  /** ISO date (YYYY-MM-DD) the provider reports for this rate. */
  date: string
}

/** One base's fetched rate table plus its wall-clock fetch timestamp. */
export interface CachedBaseRates {
  base: string
  quotes: Record<string, CachedQuote>
  fetchedAtMs: number
}

/** Versioned cache payload persisted through the PreferenceStore. */
export interface StoredRatesCache {
  schemaVersion: typeof currencySchemaVersion
  entries: Record<string, CachedBaseRates>
}

export type CacheMigrationResult = { status: "ok"; cache: StoredRatesCache } | { status: "invalid" }

export function emptyRatesCache(): StoredRatesCache {
  return { schemaVersion: currencySchemaVersion, entries: {} }
}

/**
 * Validates a persisted cache payload. Quotes are revalidated entry by entry so a
 * corrupted or hostile payload can never inject non-finite rates into arithmetic.
 */
export function migrateCache(raw: unknown): CacheMigrationResult {
  if (typeof raw !== "object" || raw === null) return { status: "invalid" }
  const record = raw as Record<string, unknown>
  if (record.schemaVersion !== currencySchemaVersion) return { status: "invalid" }
  if (typeof record.entries !== "object" || record.entries === null) {
    return { status: "invalid" }
  }
  const entries: Record<string, CachedBaseRates> = {}
  for (const [base, value] of Object.entries(record.entries as Record<string, unknown>)) {
    if (!isValidCurrencyCode(base) || typeof value !== "object" || value === null) {
      continue
    }
    const entry = value as Record<string, unknown>
    if (
      typeof entry.fetchedAtMs !== "number" ||
      !Number.isFinite(entry.fetchedAtMs) ||
      entry.fetchedAtMs <= 0
    ) {
      continue
    }
    if (entry.base !== base || typeof entry.quotes !== "object" || entry.quotes === null) {
      continue
    }
    const quotes: Record<string, CachedQuote> = {}
    for (const [quote, rawQuote] of Object.entries(entry.quotes as Record<string, unknown>)) {
      if (!isValidCurrencyCode(quote) || typeof rawQuote !== "object" || rawQuote === null) {
        continue
      }
      const quoteRecord = rawQuote as Record<string, unknown>
      const rate = quoteRecord.rate
      const date = quoteRecord.date
      if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue
      if (typeof date !== "string" || !isIsoDate(date)) continue
      quotes[quote] = { rate, date }
    }
    if (Object.keys(quotes).length > 0) {
      entries[base] = { base, quotes, fetchedAtMs: entry.fetchedAtMs }
    }
  }
  return { status: "ok", cache: { schemaVersion: currencySchemaVersion, entries } }
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isCacheFresh(entry: CachedBaseRates, nowMs: number): boolean {
  return nowMs - entry.fetchedAtMs < ratesCacheTtlMs
}

/**
 * Merges one base's rates into the cache, evicting the oldest entries when the bound is
 * exceeded. Rates are disposable data; eviction never loses user-created content.
 */
export function upsertCacheEntry(
  cache: StoredRatesCache,
  entry: CachedBaseRates,
): StoredRatesCache {
  const nextEntries = Object.fromEntries(Object.entries(cache.entries))
  nextEntries[entry.base] = entry
  const byOldest = Object.values(nextEntries).sort((a, b) => a.fetchedAtMs - b.fetchedAtMs)
  while (byOldest.length > maximumCachedBases) {
    const evicted = byOldest.shift()
    if (evicted) delete nextEntries[evicted.base]
  }
  return { schemaVersion: currencySchemaVersion, entries: nextEntries }
}

/**
 * Parses and strictly validates the provider's `/v2/rates` JSON body for one base.
 * Unknown-shaped rows are dropped so a provider schema change degrades to fewer quotes
 * instead of silently producing wrong arithmetic; a body that is not an array at all, or
 * that yields no rows for the requested base, is reported as a typed failure.
 */
export type RatesParseResult =
  | { status: "ok"; base: string; quotes: Record<string, CachedQuote> }
  | { status: "malformed" }
  | { status: "no-record"; base: string }

export function parseRatesResponse(raw: unknown, base: string): RatesParseResult {
  if (!Array.isArray(raw)) return { status: "malformed" }
  const quotes: Record<string, CachedQuote> = {}
  for (const row of raw) {
    if (typeof row !== "object" || row === null) continue
    const record = row as Record<string, unknown>
    if (record.base !== base) continue
    const rate = record.rate
    const quote = record.quote
    const date = record.date
    if (typeof quote !== "string" || !isValidCurrencyCode(quote)) continue
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) continue
    if (typeof date !== "string" || !isIsoDate(date)) continue
    // A repeated quote keeps the first row; duplicates would otherwise be ambiguous.
    if (quote in quotes) continue
    quotes[quote] = { rate, date }
  }
  if (Object.keys(quotes).length === 0) return { status: "no-record", base }
  return { status: "ok", base, quotes }
}

/** Parses the amount field. Empty input is treated as zero, not an error. */
export function parseAmount(raw: string): { status: "ok"; value: number } | { status: "invalid" } {
  const trimmed = raw.trim()
  if (trimmed === "") return { status: "ok", value: 0 }
  if (trimmed.length > 18) return { status: "invalid" }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return { status: "invalid" }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value > maximumAmount) return { status: "invalid" }
  return { status: "ok", value }
}

/** Cross-rate conversion between two currencies from one base's rate table. */
export function rateBetween(
  quotes: Record<string, CachedQuote>,
  base: string,
  from: string,
  to: string,
): CachedQuote | undefined {
  if (from === to) return { rate: 1, date: quotes[from]?.date ?? "" }
  const fromQuote: CachedQuote | undefined =
    from === base ? { rate: 1, date: quotes[to]?.date ?? "" } : quotes[from]
  const toQuote: CachedQuote | undefined =
    to === base ? { rate: 1, date: quotes[from]?.date ?? "" } : quotes[to]
  if (!fromQuote || !toQuote) return undefined
  return { rate: toQuote.rate / fromQuote.rate, date: oldestDate(fromQuote.date, toQuote.date) }
}

/**
 * A crossed rate is only as fresh as its oldest input, so the displayed data date is
 * the older one — never the newer side alone.
 */
function oldestDate(a: string, b: string): string {
  if (!a) return b
  if (!b) return a
  return a <= b ? a : b
}

/** Formats a converted amount with up to four fractional digits, no locale grouping. */
export function formatConverted(value: number): string {
  const fixed = Math.abs(value) < 1e-8 ? "0" : value.toFixed(4)
  return fixed.replace(/\.?0+$/, "") || "0"
}

/**
 * Freshness label for the rate table. A table older than the TTL is still usable
 * offline but must be labeled stale so it is never presented as current.
 */
export function describeFreshness(
  entry: CachedBaseRates,
  nowMs: number,
): { fresh: boolean; fetchedLabel: string } {
  const fresh = isCacheFresh(entry, nowMs)
  const ageMinutes = Math.max(0, Math.floor((nowMs - entry.fetchedAtMs) / 60_000))
  const fetchedLabel =
    ageMinutes < 1
      ? "just now"
      : ageMinutes < 60
        ? `${ageMinutes} min ago`
        : `${Math.floor(ageMinutes / 60)} h ago`
  return { fresh, fetchedLabel }
}
