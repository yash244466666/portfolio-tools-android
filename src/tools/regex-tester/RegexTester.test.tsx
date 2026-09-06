import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import RegexTester from "@/tools/regex-tester/RegexTester"
import type { RegexRunner } from "@/tools/regex-tester/regex-client"
import type { RegexRunResult } from "@/tools/regex-tester/regex"

const runMock = vi.hoisted(() => vi.fn())
const cancelMock = vi.hoisted(() => vi.fn())
const disposeMock = vi.hoisted(() => vi.fn())

vi.mock("@/tools/regex-tester/regex-client", () => ({
  createRegexRunner: (): RegexRunner => ({
    run: runMock,
    cancel: cancelMock,
    dispose: disposeMock,
  }),
}))

let resolveCurrentRun: ((result: RegexRunResult) => void) | null = null

function renderTool() {
  render(
    <PlatformProvider>
      <RegexTester />
    </PlatformProvider>,
  )
}

function typeInto(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function finishTyping() {
  act(() => {
    vi.advanceTimersByTime(250)
  })
  vi.useRealTimers()
}

async function resolveNextRun(result: RegexRunResult) {
  expect(runMock).toHaveBeenCalled()
  expect(resolveCurrentRun).not.toBeNull()
  await act(async () => {
    resolveCurrentRun?.(result)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  runMock.mockReset()
  cancelMock.mockClear()
  disposeMock.mockClear()
  resolveCurrentRun = null
  runMock.mockImplementation(
    () =>
      new Promise<RegexRunResult>((resolve) => {
        resolveCurrentRun = resolve
      }),
  )
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Regex Tester interactions", () => {
  it("starts in the empty state and evaluates a typed pattern", async () => {
    renderTool()
    expect(screen.getByText("Enter a pattern to see its matches.")).toBeVisible()

    typeInto("Pattern", "\\d+")
    typeInto("Test string", "a1b22")
    finishTyping()
    await resolveNextRun({
      status: "ok",
      matches: [
        { text: "1", index: 1, groups: [] },
        { text: "22", index: 3, groups: [] },
      ],
      truncated: false,
    })

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Matches (2)" })).toBeVisible()
    })
    expect(screen.getByText("#1 at index 1:")).toBeVisible()
    expect(screen.getByText("#2 at index 3:")).toBeVisible()
  })

  it("shows capture groups beside each match", async () => {
    renderTool()
    typeInto("Pattern", "(a)(b)")
    typeInto("Test string", "ab")
    finishTyping()
    await resolveNextRun({
      status: "ok",
      matches: [{ text: "ab", index: 0, groups: ["a", "b"] }],
      truncated: false,
    })

    await waitFor(() => {
      expect(screen.getByText(/groups: 1: a, 2: b/)).toBeVisible()
    })
  })

  it("renders invalid patterns as an error near the pattern field", async () => {
    renderTool()
    typeInto("Pattern", "(")
    typeInto("Test string", "text")
    finishTyping()
    await resolveNextRun({ status: "invalid", message: "Unterminated group." })

    await waitFor(() => {
      expect(screen.getByText("Unterminated group.")).toBeVisible()
      expect(screen.getByText("Fix the pattern or flags to see matches.")).toBeVisible()
    })
  })

  it("reports timed-out hostile patterns with recovery guidance", async () => {
    renderTool()
    typeInto("Pattern", "(a+)+$")
    typeInto("Test string", `${"a".repeat(30)}!`)
    finishTyping()
    await resolveNextRun({ status: "timeout" })

    await waitFor(() => {
      expect(screen.getByText(/stopped because it exceeded the time budget/)).toBeVisible()
    })
  })

  it("rejects oversized test strings without running the worker", () => {
    renderTool()
    typeInto("Pattern", "a")
    typeInto("Test string", "a".repeat(128 * 1024 + 1))
    expect(screen.getByText(/exceeds the 128 KiB limit/)).toBeVisible()
    expect(runMock).not.toHaveBeenCalled()
    expect(screen.getByText("Shorten the pattern or test string to see matches.")).toBeVisible()
  })

  it("resets the inputs back to the initial state", async () => {
    renderTool()
    typeInto("Pattern", "a")
    typeInto("Test string", "a")
    finishTyping()
    await resolveNextRun({
      status: "ok",
      matches: [{ text: "a", index: 0, groups: [] }],
      truncated: false,
    })
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Matches (1)" })).toBeVisible()
    })

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => {
      expect(screen.getByLabelText("Pattern")).toHaveValue("")
      expect(screen.getByLabelText("Test string")).toHaveValue("")
      expect(screen.getByText("Enter a pattern to see its matches.")).toBeVisible()
    })
  })
})
