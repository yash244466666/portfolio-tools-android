import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { NetworkState, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import CurrencyConverter from "@/tools/currency-converter/CurrencyConverter"

const fixtureUsdRates = [
  { date: "2026-09-07", base: "USD", quote: "EUR", rate: 0.86044 },
  { date: "2026-09-07", base: "USD", quote: "BDT", rate: 122.8 },
  { date: "2026-09-07", base: "USD", quote: "GBP", rate: 0.7391 },
]

const fetchMock = vi.hoisted(() => vi.fn())
const networkState = vi.hoisted(
  (): NetworkState => ({ connected: true, connectionType: "wifi" }),
)

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    network: {
      current: () => Promise.resolve(networkState),
      subscribe: () => {
        return Promise.resolve(() => {})
      },
    },
  }
  return { platformServices: services }
})

function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response
}

function renderTool() {
  return render(
    <PlatformProvider>
      <CurrencyConverter />
    </PlatformProvider>,
  )
}

/** Flushes the preference-load microtask and the fetch promise. */
async function settle() {
  await act(async () => {})
  await act(async () => {})
}

/** Provider bodies keyed by requested base, so base changes get real per-base tables. */
const fixtureBaseTables: Record<string, unknown[]> = {
  USD: fixtureUsdRates,
  BDT: [
    { date: "2026-09-07", base: "BDT", quote: "USD", rate: 1 / 122.8 },
    { date: "2026-09-07", base: "BDT", quote: "EUR", rate: 0.86044 / 122.8 },
  ],
}

beforeEach(() => {
  window.localStorage.clear()
  fetchMock.mockReset()
  fetchMock.mockImplementation((input: URL) =>
    Promise.resolve(
      okResponse(fixtureBaseTables[new URL(String(input)).searchParams.get("base") ?? ""] ?? []),
    ),
  )
  vi.stubGlobal("fetch", fetchMock)
  networkState.connected = true
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("Currency Converter interactions", () => {
  it("fetches the default base and shows the conversion with freshness", async () => {
    renderTool()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = fetchMock.mock.calls[0]?.[0] as URL
    expect(url.href).toBe("https://api.frankfurter.dev/v2/rates?base=USD")
    expect(screen.getByText("0.8604 EUR")).toBeInTheDocument()
    expect(screen.getByText(/1 USD = 0.8604 EUR · provider data date 2026-09-07/)).toBeVisible()
    expect(screen.getByText(/Fresh rates fetched just now from Frankfurter/)).toBeVisible()
    expect(screen.getByText(/Rates come from Frankfurter/)).toBeVisible()
  })

  it("updates the result as the amount changes", async () => {
    renderTool()
    await settle()

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "2" } })
    expect(screen.getByText("1.7209 EUR")).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "" } })
    expect(screen.getByText("0 EUR")).toBeInTheDocument()
  })

  it("rejects invalid amounts without refetching", async () => {
    renderTool()
    await settle()

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "12abc" } })
    expect(screen.getByText(/Enter a number up to 1,000,000,000/)).toBeVisible()
    expect(screen.getByText("—")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("refetches when the From currency changes and converts cross rates", async () => {
    renderTool()
    await settle()

    fireEvent.change(screen.getByLabelText("From"), { target: { value: "BDT" } })
    await settle()

    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ href: "https://api.frankfurter.dev/v2/rates?base=BDT" }),
      expect.objectContaining({ method: "GET" }),
    )
    // 1 BDT in USD crosses through the fetched USD table: 1 / 122.8.
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "USD" } })
    expect(screen.getByText("0.0081 USD")).toBeInTheDocument()
  })

  it("serves a fresh cached base without a second network call", async () => {
    const { unmount } = renderTool()
    await settle()
    unmount()

    renderTool()
    await settle()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/Fresh rates fetched/)).toBeVisible()
  })

  it("persists the fetched rates in the versioned preference", async () => {
    renderTool()
    await settle()

    const stored = JSON.parse(
      window.localStorage.getItem("yash-tools:v1:currency:rates") ?? "",
    ) as {
      schemaVersion: number
      entries: Record<string, { quotes: Record<string, { rate: number; date: string }> }>
    }
    expect(stored.schemaVersion).toBe(1)
    expect(stored.entries.USD?.quotes.EUR).toEqual({ rate: 0.86044, date: "2026-09-07" })
  })

  it("shows a stale cached table when offline", async () => {
    // Seed the cache, then load with the network down.
    const seeded = {
      schemaVersion: 1,
      entries: {
        USD: {
          base: "USD",
          quotes: { EUR: { rate: 0.5, date: "2026-09-01" } },
          fetchedAtMs: Date.now() - 26 * 60 * 60 * 1000,
        },
      },
    }
    window.localStorage.setItem("yash-tools:v1:currency:rates", JSON.stringify(seeded))
    networkState.connected = false
    fetchMock.mockRejectedValue(new TypeError("network offline"))

    renderTool()
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Offline — cached rates are used/)).toBeVisible()
    expect(screen.getByText(/Stale rates fetched/)).toBeVisible()
    expect(screen.getByText("0.5 EUR")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Refresh rates" })).toBeDisabled()
  })

  it("shows reconnect guidance when offline with no cache", async () => {
    networkState.connected = false
    renderTool()
    await settle()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/Offline — cached rates are used/)).toBeVisible()
    expect(screen.getByText("Reconnect to the internet to fetch exchange rates.")).toBeVisible()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("maps a rate-limited response to its own state", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 429, json: () => Promise.resolve({}) })
    renderTool()
    await settle()

    expect(screen.getByText(/The rate provider is limiting requests/)).toBeVisible()
  })

  it("maps a provider failure to its own state", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({}) })
    renderTool()
    await settle()

    expect(screen.getByText(/The rate provider returned an error/)).toBeVisible()
  })

  it("maps a schema-invalid response to the malformed state", async () => {
    fetchMock.mockResolvedValue(okResponse({ unexpected: "shape" }))
    renderTool()
    await settle()

    expect(screen.getByText(/The provider response could not be understood/)).toBeVisible()
  })

  it("maps a network rejection to the offline-retry state while online", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed to fetch"))
    renderTool()
    await settle()

    expect(screen.getByText(/Rates could not be fetched/)).toBeVisible()
  })

  it("reports a timed-out request distinctly", async () => {
    fetchMock.mockImplementation(
      (_input: URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        }),
    )
    vi.useFakeTimers()
    try {
      renderTool()
      // Flush the preference load so the fetch effect runs, then pass the 15 s budget.
      await act(async () => {})
      await act(async () => {
        vi.advanceTimersByTime(16_000)
      })
      await act(async () => {})
      expect(screen.getByText(/The rate request timed out/)).toBeVisible()
      expect(screen.getByText("—")).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it("swaps currencies and resets back to the defaults", async () => {
    renderTool()
    await settle()

    fireEvent.click(screen.getByRole("button", { name: "Swap currencies" }))
    expect(screen.getByLabelText("From")).toHaveValue("EUR")
    expect(screen.getByLabelText("To")).toHaveValue("USD")

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByLabelText("From")).toHaveValue("USD")
    expect(screen.getByLabelText("To")).toHaveValue("EUR")
    expect(screen.getByLabelText("Amount")).toHaveValue("1")
    expect(screen.getByText("Currency tool reset.")).toBeVisible()
  })
})