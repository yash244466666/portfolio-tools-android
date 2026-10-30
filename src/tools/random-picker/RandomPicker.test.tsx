import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import RandomPicker from "./RandomPicker"

function renderTool() {
  render(
    <PlatformProvider>
      <RandomPicker />
    </PlatformProvider>,
  )
}

function resultText(): string | null | undefined {
  return document.querySelector("#random-picker-result")?.textContent
}

describe("RandomPicker interactions", () => {
  it("picks one of the entered list items", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Items"), {
      target: { value: "Pizza\nSushi\nTacos" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Pick an item" }))
    expect(resultText()).toMatch(/^(Pizza|Sushi|Tacos)$/)
  })

  it("flips Heads or Tails", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Coin flip" }))
    fireEvent.click(screen.getByRole("button", { name: "Flip coin" }))
    expect(resultText()).toMatch(/^(Heads|Tails)$/)
  })

  it("picks a single-value number range deterministically", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Number" }))
    fireEvent.change(screen.getByLabelText("Minimum"), { target: { value: "5" } })
    fireEvent.change(screen.getByLabelText("Maximum"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Pick a number" }))
    expect(resultText()).toBe("5")
  })

  it("explains an unusable list and an inverted range", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Items"), { target: { value: "only one" } })
    fireEvent.click(screen.getByRole("button", { name: "Pick an item" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least two items")

    fireEvent.click(screen.getByRole("button", { name: "Number" }))
    fireEvent.change(screen.getByLabelText("Minimum"), { target: { value: "9" } })
    fireEvent.change(screen.getByLabelText("Maximum"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Pick a number" }))
    expect(screen.getByRole("alert")).toHaveTextContent("minimum must not be greater")
  })
})
