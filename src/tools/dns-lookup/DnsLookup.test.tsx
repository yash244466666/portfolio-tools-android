import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { NetworkState, PlatformServices } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import DnsLookup from "@/tools/dns-lookup/DnsLookup"

const fetchMock = vi.hoisted(() => vi.fn())
const networkState = vi.hoisted((): NetworkState => ({ connected: true, connectionType: "wifi" }))

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

/** The DNS client reads the body as text before parsing, so the fake mirrors that. */
function okResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response
}

const capturedAnswer = {
  Status: 0,
  Question: [{ name: "example.com", type: 1 }],
  Answer: [
    { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
    { name: "example.com", type: 1, TTL: 116, data: "104.20.23.154" },
  ],
}

function renderTool() {
  return render(
    <PlatformProvider>
      <DnsLookup />
    </PlatformProvider>,
  )
}

function enterDomain(value: string) {
  fireEvent.change(screen.getByLabelText("Domain name"), { target: { value } })
}

function clickLookup() {
  fireEvent.click(screen.getByRole("button", { name: "Look up" }))
}

async function settle() {
  await act(async () => {})
  await act(async () => {})
}

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue(okResponse(capturedAnswer))
  vi.stubGlobal("fetch", fetchMock)
  networkState.connected = true
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("DNS Lookup interactions", () => {
  it("looks up A records and renders the answer table", async () => {
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [input, init] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(input.href).toBe("https://cloudflare-dns.com/dns-query?name=example.com&type=A")
    expect(init.headers).toEqual({ accept: "application/dns-json" })
    expect(screen.getByText("2 records for example.com · answered by Cloudflare")).toBeVisible()
    expect(screen.getByText("172.66.147.243")).toBeInTheDocument()
    expect(screen.getByText("104.20.23.154")).toBeInTheDocument()
    expect(screen.getByText(/Lookups are answered by Cloudflare/)).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy records result" })).toBeInTheDocument()
  })

  it("submits on Enter and uses the selected record type", async () => {
    renderTool()
    enterDomain("example.com")
    fireEvent.change(screen.getByLabelText("Record type"), { target: { value: "TXT" } })
    fireEvent.submit(screen.getByLabelText("Domain name").closest("form") as HTMLFormElement)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await settle()

    const [input] = fetchMock.mock.calls[0] as [URL, RequestInit]
    expect(input.href).toBe("https://cloudflare-dns.com/dns-query?name=example.com&type=TXT")
  })

  it("rejects an invalid domain without calling the provider", async () => {
    renderTool()
    enterDomain("bad..name")
    clickLookup()
    await settle()

    expect(screen.getByText(/Each part of the name must be/)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("maps NXDOMAIN to a typed DNS error message", async () => {
    fetchMock.mockResolvedValue(
      okResponse({ Status: 3, Question: [{ name: "missing.example", type: 1 }] }),
    )
    renderTool()
    enterDomain("missing.example")
    clickLookup()
    await settle()

    expect(
      screen.getByText(/missing\.example: The domain does not exist \(NXDOMAIN\)/),
    ).toBeVisible()
  })

  it("reports a NOERROR answer without records", async () => {
    fetchMock.mockResolvedValue(okResponse({ Status: 0 }))
    renderTool()
    enterDomain("example.com")
    fireEvent.change(screen.getByLabelText("Record type"), { target: { value: "TXT" } })
    clickLookup()
    await settle()

    expect(screen.getByText(/No TXT records were returned for example\.com/)).toBeVisible()
  })

  it("labels CNAME chain rows with their own record types", async () => {
    fetchMock.mockResolvedValue(
      okResponse({
        Status: 0,
        Answer: [
          { name: "www.example.com", type: 5, TTL: 300, data: "example.com" },
          { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
        ],
      }),
    )
    renderTool()
    enterDomain("www.example.com")
    clickLookup()
    await settle()

    // The record-type select's options share these texts; query inside the table only.
    const tbody = document.querySelector("tbody") as HTMLElement
    expect(tbody.textContent).toContain("www.example.com")
    expect(tbody.textContent).toContain("CNAME")
    expect(tbody.textContent).toContain("A")
    expect(tbody.textContent).toContain("example.com")
  })

  it("caps displayed records and says so", async () => {
    const many = Array.from({ length: 70 }, (_unused, index) => ({
      name: "example.com",
      type: 16,
      TTL: 60,
      data: `chunk-${index}`,
    }))
    fetchMock.mockResolvedValue(okResponse({ Status: 0, Answer: many }))
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()

    expect(screen.getByText("64 records for example.com · answered by Cloudflare")).toBeVisible()
    expect(screen.getByText("Showing the first 64 records.")).toBeVisible()
  })

  it("maps HTTP 400 rejection, rate limiting, and provider errors distinctly", async () => {
    renderTool()
    enterDomain("example.com")

    fetchMock.mockResolvedValue({ ok: false, status: 400, text: () => Promise.resolve("") })
    clickLookup()
    await settle()
    expect(screen.getByText(/The resolver rejected this query/)).toBeVisible()

    fetchMock.mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve("") })
    clickLookup()
    await settle()
    expect(screen.getByText(/limiting requests right now/)).toBeVisible()

    fetchMock.mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("") })
    clickLookup()
    await settle()
    expect(screen.getByText(/The DNS resolver returned an error/)).toBeVisible()
  })

  it("maps a malformed response body to the malformed state", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("not json"),
    })
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()

    expect(screen.getByText(/The resolver response could not be understood/)).toBeVisible()
  })

  it("maps a schema-invalid JSON body to the malformed state", async () => {
    fetchMock.mockResolvedValue(okResponse({ unexpected: "shape" }))
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()

    expect(screen.getByText(/The resolver response could not be understood/)).toBeVisible()
  })

  it("maps a network rejection to the offline-retry state while online", async () => {
    fetchMock.mockRejectedValue(new TypeError("failed to fetch"))
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()

    expect(screen.getByText(/The lookup could not be sent/)).toBeVisible()
  })

  it("reports a timed-out lookup distinctly", async () => {
    fetchMock.mockImplementation(
      (_input: URL, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"))
          })
        }),
    )
    renderTool()
    enterDomain("example.com")
    // The 15 s timeout registers at click time, so fake timers must be active first.
    vi.useFakeTimers()
    try {
      clickLookup()
      await act(async () => {
        vi.advanceTimersByTime(16_000)
      })
      await act(async () => {})
      expect(screen.getByText(/The lookup timed out/)).toBeVisible()
    } finally {
      vi.useRealTimers()
    }
  })

  it("disables lookup while offline and shows the offline chip", async () => {
    networkState.connected = false
    renderTool()
    await settle()

    const button = screen.getByRole("button", { name: "Look up" })
    expect(button).toBeDisabled()
    expect(screen.getByText(/Offline — lookups need a connection\./)).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("shows the idle guidance before any lookup", () => {
    renderTool()
    expect(screen.getByText("Enter a domain name to look up its DNS records.")).toBeVisible()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("resets the form and results", async () => {
    renderTool()
    enterDomain("example.com")
    clickLookup()
    await settle()
    expect(screen.getByText("172.66.147.243")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(screen.getByLabelText("Domain name")).toHaveValue("")
    expect(screen.getByLabelText("Record type")).toHaveValue("A")
    expect(screen.getByText("Enter a domain name to look up its DNS records.")).toBeVisible()
    expect(screen.getByText("DNS tool reset.")).toBeVisible()
  })
})
