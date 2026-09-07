import { describe, expect, it } from "vitest"
import { currencyCatalog } from "./catalog"
import {
  buildRatesUrl,
  currencyCodes,
  currencyCount,
  defaultFromCurrency,
  defaultToCurrency,
  describeFreshness,
  emptyRatesCache,
  formatConverted,
  isCacheFresh,
  isValidCurrencyCode,
  maximumAmount,
  maximumCachedBases,
  migrateCache,
  parseAmount,
  parseRatesResponse,
  rateBetween,
  ratesCacheTtlMs,
  upsertCacheEntry,
  type CachedBaseRates,
  type StoredRatesCache,
} from "./currency"

/** Rows trimmed from a real captured Frankfurter v2 `/rates?base=USD` response. */
const capturedUsdRows = [
  { date: "2026-09-07", base: "USD", quote: "EUR", rate: 0.86044 },
  { date: "2026-09-07", base: "USD", quote: "BDT", rate: 122.8 },
  { date: "2026-09-04", base: "USD", quote: "ALL", rate: 79.114 },
  { date: "2026-09-07", base: "EUR", quote: "USD", rate: 1.16 },
]

describe("currency catalog snapshot", () => {
  it("holds the expected active currency set", () => {
    expect(currencyCount).toBe(165)
    expect(currencyCatalog.length).toBe(currencyCount)
    expect(new Set(currencyCodes).size).toBe(currencyCount)
  })

  it("covers the required reference currencies", () => {
    for (const code of ["USD", "EUR", "BDT", "INR", "JPY", "GBP"]) {
      expect(isValidCurrencyCode(code), code).toBe(true)
    }
  })

  it("uses only uppercase three-letter ISO codes with non-empty names", () => {
    for (const entry of currencyCatalog) {
      expect(entry.code, entry.code).toMatch(/^[A-Z]{3}$/)
      expect(entry.name.length).toBeGreaterThan(0)
    }
  })

  it("keeps the foundation defaults selectable", () => {
    expect(isValidCurrencyCode(defaultFromCurrency)).toBe(true)
    expect(isValidCurrencyCode(defaultToCurrency)).toBe(true)
  })
})

describe("buildRatesUrl", () => {
  it("builds the HTTPS-only exact-origin request", () => {
    const url = buildRatesUrl("USD")
    expect(url.protocol).toBe("https:")
    expect(url.host).toBe("api.frankfurter.dev")
    expect(url.pathname).toBe("/v2/rates")
    expect(url.searchParams.get("base")).toBe("USD")
  })

  it("refuses to interpolate an unvalidated code", () => {
    expect(() => buildRatesUrl("nope")).toThrow(RangeError)
    expect(() => buildRatesUrl("USD?x=1")).toThrow(RangeError)
  })
})

describe("parseRatesResponse", () => {
  it("parses the captured provider body", () => {
    const parsed = parseRatesResponse(capturedUsdRows, "USD")
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.base).toBe("USD")
    expect(parsed.quotes["EUR"]).toEqual({ rate: 0.86044, date: "2026-09-07" })
    expect(parsed.quotes["BDT"]).toEqual({ rate: 122.8, date: "2026-09-07" })
    expect(parsed.quotes["ALL"]).toEqual({ rate: 79.114, date: "2026-09-04" })
    // Rows for a different base are excluded.
    expect(parsed.quotes["USD"]).toBeUndefined()
  })

  it("rejects a body that is not an array", () => {
    expect(parseRatesResponse({ rates: {} }, "USD").status).toBe("malformed")
    expect(parseRatesResponse("[]", "USD").status).toBe("malformed")
    expect(parseRatesResponse(null, "USD").status).toBe("malformed")
  })

  it("reports no-record when the base has no valid rows", () => {
    expect(parseRatesResponse([], "USD")).toEqual({ status: "no-record", base: "USD" })
    expect(parseRatesResponse([{ date: "2026-09-07", base: "EUR", quote: "USD", rate: 1 }], "USD").status).toBe(
      "no-record",
    )
  })

  it("drops rows that fail validation instead of trusting them", () => {
    const hostile = [
      { date: "2026-09-07", base: "USD", quote: "EUR", rate: 0 }, // non-positive
      { date: "2026-09-07", base: "USD", quote: "GBP", rate: -1 }, // negative
      { date: "2026-09-07", base: "USD", quote: "JPY", rate: "156" }, // string rate
      { date: "not-a-date", base: "USD", quote: "CHF", rate: 0.8 }, // bad date
      { date: "2026-09-07", base: "USD", quote: "nope", rate: 1 }, // unknown quote code
      { base: "USD", quote: "SEK", rate: 1 }, // missing date
      "row", // not an object
      null,
    ]
    const parsed = parseRatesResponse(hostile, "USD")
    expect(parsed.status).toBe("no-record")
  })

  it("keeps the first row when the provider repeats a quote", () => {
    const duplicated = [
      { date: "2026-09-07", base: "USD", quote: "EUR", rate: 0.86 },
      { date: "2026-09-06", base: "USD", quote: "EUR", rate: 0.85 },
    ]
    const parsed = parseRatesResponse(duplicated, "USD")
    expect(parsed.status).toBe("ok")
    if (parsed.status !== "ok") return
    expect(parsed.quotes["EUR"]).toEqual({ rate: 0.86, date: "2026-09-07" })
  })
})

describe("parseAmount", () => {
  it("accepts plain decimal amounts", () => {
    expect(parseAmount("1")).toEqual({ status: "ok", value: 1 })
    expect(parseAmount("2.5")).toEqual({ status: "ok", value: 2.5 })
    expect(parseAmount("")).toEqual({ status: "ok", value: 0 })
    expect(parseAmount(" 12 ")).toEqual({ status: "ok", value: 12 })
  })

  it("rejects non-decimal or oversized amounts", () => {
    expect(parseAmount("abc").status).toBe("invalid")
    expect(parseAmount("1,5").status).toBe("invalid")
    expect(parseAmount("1e5").status).toBe("invalid")
    expect(parseAmount(".5").status).toBe("invalid")
    expect(parseAmount("5.").status).toBe("invalid")
    expect(parseAmount("-3").status).toBe("invalid")
    expect(parseAmount("1".repeat(19)).status).toBe("invalid")
    expect(parseAmount(`${maximumAmount + 1}`).status).toBe("invalid")
  })

  it("accepts the maximum amount and bounded 18-character input", () => {
    expect(parseAmount(`${maximumAmount}`).status).toBe("ok")
    expect(parseAmount("12345678.123456789").status).toBe("ok")
    // An 18-digit integer exceeds the magnitude bound even though it fits the length bound.
    expect(parseAmount("123456789012345678").status).toBe("invalid")
  })
})

describe("rateBetween", () => {
  const quotes = {
    EUR: { rate: 0.86044, date: "2026-09-07" },
    BDT: { rate: 122.8, date: "2026-09-07" },
    ALL: { rate: 79.114, date: "2026-09-04" },
  }

  it("uses the direct quote when the base is the From currency", () => {
    expect(rateBetween(quotes, "USD", "USD", "EUR")).toEqual({
      rate: 0.86044,
      date: "2026-09-07",
    })
  })

  it("crosses rates through the base for other pairs", () => {
    const eurToBdt = rateBetween(quotes, "USD", "EUR", "BDT")
    expect(eurToBdt?.rate).toBeCloseTo(122.8 / 0.86044, 10)
    expect(eurToBdt?.date).toBe("2026-09-07")
  })

  it("reports the older of the two data dates for a crossed pair", () => {
    const allToBdt = rateBetween(quotes, "USD", "ALL", "BDT")
    expect(allToBdt?.date).toBe("2026-09-04")
    const bdtToAll = rateBetween(quotes, "USD", "BDT", "ALL")
    expect(bdtToAll?.date).toBe("2026-09-04")
  })

  it("returns a unit rate for identical currencies", () => {
    expect(rateBetween(quotes, "USD", "EUR", "EUR")).toEqual({
      rate: 1,
      date: "2026-09-07",
    })
    expect(rateBetween({}, "USD", "USD", "USD")).toEqual({ rate: 1, date: "" })
  })

  it("converts back to the base through a unit rate", () => {
    const eurToUsd = rateBetween(quotes, "USD", "EUR", "USD")
    expect(eurToUsd?.rate).toBeCloseTo(1 / 0.86044, 10)
    expect(eurToUsd?.date).toBe("2026-09-07")
  })

  it("is undefined when either side is missing from the table", () => {
    expect(rateBetween(quotes, "USD", "USD", "ZAR")).toBeUndefined()
    expect(rateBetween(quotes, "USD", "ZAR", "USD")).toBeUndefined()
  })
})

describe("cache migration", () => {
  const entry: CachedBaseRates = {
    base: "USD",
    quotes: { EUR: { rate: 0.86044, date: "2026-09-07" } },
    fetchedAtMs: 1_700_000_000_000,
  }

  it("round-trips a valid payload", () => {
    const cache: StoredRatesCache = { schemaVersion: 1, entries: { USD: entry } }
    const migrated = migrateCache(cache)
    expect(migrated.status).toBe("ok")
    if (migrated.status !== "ok") return
    expect(migrated.cache.entries["USD"]).toEqual(entry)
  })

  it("rejects foreign shapes and versions", () => {
    expect(migrateCache(null).status).toBe("invalid")
    expect(migrateCache("x").status).toBe("invalid")
    expect(migrateCache({ schemaVersion: 2, entries: {} }).status).toBe("invalid")
    expect(migrateCache({ schemaVersion: 1 }).status).toBe("invalid")
    expect(migrateCache({ schemaVersion: 1, entries: "x" }).status).toBe("invalid")
  })

  it("drops corrupt entries and quotes without trusting them", () => {
    const migrated = migrateCache({
      schemaVersion: 1,
      entries: {
        USD: {
          base: "USD",
          quotes: {
            EUR: { rate: 0.86, date: "2026-09-07" },
            GBP: { rate: "0.7", date: "2026-09-07" },
            CHF: { rate: Infinity, date: "2026-09-07" },
            JPY: { rate: 156, date: "yesterday" },
          },
          fetchedAtMs: 1,
        },
        nope: { base: "nope", quotes: {}, fetchedAtMs: 2 },
        EUR: { base: "EUR", quotes: {}, fetchedAtMs: 3 },
      },
    })
    expect(migrated.status).toBe("ok")
    if (migrated.status !== "ok") return
    expect(Object.keys(migrated.cache.entries)).toEqual(["USD"])
    expect(Object.keys(migrated.cache.entries["USD"]?.quotes ?? {})).toEqual(["EUR"])
  })
})

describe("cache freshness and eviction", () => {
  const entry = (fetchedAtMs: number, base = "USD"): CachedBaseRates => ({
    base,
    quotes: { EUR: { rate: 0.86, date: "2026-09-07" } },
    fetchedAtMs,
  })

  it("treats entries inside the TTL as fresh and past it as stale", () => {
    const now = 10_000_000
    expect(isCacheFresh(entry(now - 1), now)).toBe(true)
    expect(isCacheFresh(entry(now - ratesCacheTtlMs + 1), now)).toBe(true)
    expect(isCacheFresh(entry(now - ratesCacheTtlMs), now)).toBe(false)
  })

  it("evicts the oldest base beyond the bound", () => {
    let cache = emptyRatesCache()
    for (let index = 0; index < maximumCachedBases + 3; index++) {
      cache = upsertCacheEntry(cache, entry(index * 1_000, `C${index}D`))
    }
    const bases = Object.keys(cache.entries)
    expect(bases.length).toBe(maximumCachedBases)
    expect(bases).toContain("C7D") // one of the last three
    expect(bases).not.toContain("C0D")
    expect(bases).not.toContain("C2D")
  })

  it("replaces an existing base without growing the cache", () => {
    let cache = upsertCacheEntry(emptyRatesCache(), entry(1, "USD"))
    cache = upsertCacheEntry(cache, entry(2, "USD"))
    expect(Object.keys(cache.entries)).toEqual(["USD"])
    expect(cache.entries["USD"]?.fetchedAtMs).toBe(2)
  })
})

describe("formatting and freshness labels", () => {
  it("formats converted amounts without locale grouping", () => {
    expect(formatConverted(0)).toBe("0")
    expect(formatConverted(122.8)).toBe("122.8")
    expect(formatConverted(0.86044)).toBe("0.8604")
    expect(formatConverted(2 * 0.86044)).toBe("1.7209")
    expect(formatConverted(1_000_000)).toBe("1000000")
    expect(formatConverted(1.00001)).toBe("1")
  })

  it("labels fetched-at times by age", () => {
    const now = 60_000 * 10
    expect(describeFreshness(entry(now - 30_000), now).fetchedLabel).toBe("just now")
    expect(describeFreshness(entry(now - 60_000 * 5), now).fetchedLabel).toBe("5 min ago")
    expect(describeFreshness(entry(now - 60_000 * 90), now).fetchedLabel).toBe("1 h ago")
    expect(describeFreshness(entry(now - 30_000), now).fresh).toBe(true)
    expect(describeFreshness(entry(now - ratesCacheTtlMs - 1), now).fresh).toBe(false)
  })
})

function entry(fetchedAtMs: number): CachedBaseRates {
  return { base: "USD", quotes: { EUR: { rate: 0.86, date: "2026-09-07" } }, fetchedAtMs }
}