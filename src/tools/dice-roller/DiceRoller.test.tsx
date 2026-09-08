import { fireEvent, render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type * as platformModule from "@/platform/services"
import type { PlatformServices } from "@/platform/contracts"
import DiceRoller from "./DiceRoller"

const bytesMock = vi.hoisted(() => {
  const holder = { sequence: [0], index: 0 }
  const fn = vi.fn(() => {
    const value = new Uint8Array([holder.sequence[holder.index % holder.sequence.length] ?? 0])
    holder.index += 1
    return value
  })
  return Object.assign(fn, {
    /** Re-arms the deterministic byte sequence and resets the cursor. */
    feed: (sequence: number[]) => {
      holder.sequence = sequence
      holder.index = 0
    },
  })
})

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    random: { ...base.random, bytes: bytesMock },
  }
  return { ...actual, platformServices: services }
})

function renderTool() {
  render(
    <PlatformProvider>
      <DiceRoller />
    </PlatformProvider>,
  )
}

describe("DiceRoller", () => {
  it("starts with the default notation and an empty result", () => {
    renderTool()
    expect(screen.getByLabelText("Dice notation")).toHaveValue("2d6")
    expect(screen.getByRole("status")).toHaveTextContent(/enter notation and roll/i)
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })

  it("rolls via the platform random bytes and lists per-die results", () => {
    renderTool()
    // 2d6 consumes bytes 0,1 -> faces 1,2; total 3.
    bytesMock.feed([0, 1])
    fireEvent.click(screen.getByRole("button", { name: /roll$/i }))
    expect(screen.getByRole("status")).toHaveTextContent(/total 3 from 2d6/i)
    const table = screen.getByRole("table")
    expect(table).toHaveTextContent("1, 2")
    expect(table).toHaveTextContent("3")
  })

  it("reports invalid notation with a visible alert", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Dice notation"), { target: { value: "1d7" } })
    expect(screen.getByRole("alert")).toHaveTextContent(/not available/i)
    expect(screen.getByRole("status")).toHaveTextContent(/fix the notation/i)
    expect(screen.getByRole("button", { name: /roll$/i })).toBeDisabled()
  })

  it("repeats the last roll from fresh random bytes", () => {
    renderTool()
    bytesMock.feed([0, 1])
    fireEvent.click(screen.getByRole("button", { name: /roll$/i }))
    expect(screen.getByRole("status")).toHaveTextContent(/total 3/i)
    bytesMock.feed([2, 3, 5])
    fireEvent.click(screen.getByRole("button", { name: /repeat last roll/i }))
    expect(screen.getByRole("status")).toHaveTextContent(/total 7/i)
  })
})
