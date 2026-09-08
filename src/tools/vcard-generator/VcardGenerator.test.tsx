import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import VcardGenerator from "./VcardGenerator"

function renderTool() {
  render(
    <PlatformProvider>
      <VcardGenerator />
    </PlatformProvider>,
  )
}

describe("VcardGenerator interactions", () => {
  it("builds a vCard from typed details", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } })
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Lovelace" } })
    fireEvent.change(screen.getByLabelText("Organization (optional)"), {
      target: { value: "Acme; Inc" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard" }))
    const card = document.querySelector("pre")?.textContent ?? ""
    expect(card).toContain("BEGIN:VCARD")
    expect(card).toContain("N:Lovelace;Ada;;;")
    expect(card).toContain("FN:Ada Lovelace")
    expect(card).toContain("ORG:Acme\\; Inc")
  })

  it("requires a name and keeps no stale output", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter at least a first or last name")
    expect(screen.queryByText("Result")).toBeNull()

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard" }))
    expect(screen.getByText("Result")).toBeVisible()
  })

  it("accepts only https website URLs", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } })
    fireEvent.change(screen.getByLabelText("Website (optional)"), {
      target: { value: "http://example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Enter an https website URL.")
  })

  it("clears back to the empty state", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Ada" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate vCard" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.queryByText("Result")).toBeNull()
    expect(screen.getByLabelText("First name")).toHaveValue("")
  })
})