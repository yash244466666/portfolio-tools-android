import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import UuidGenerator from "@/tools/uuid-generator/UuidGenerator"

const oneUuid = "[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"

function renderTool() {
  return render(
    <PlatformProvider>
      <UuidGenerator />
    </PlatformProvider>,
  )
}

function outputValue(): string {
  const element = screen.getByLabelText("Generated UUIDs")
  if (!(element instanceof HTMLTextAreaElement)) {
    throw new Error("The generated UUIDs output panel is missing.")
  }
  return element.value
}

describe("UUID Generator interactions", () => {
  it("generates one valid version-4 UUID by default", () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: "Generate UUIDs" }))
    expect(outputValue()).toMatch(new RegExp(`^${oneUuid}$`))
    expect(screen.getByRole("heading", { name: "Generated UUIDs (1)" })).toBeVisible()
  })

  it("honours the requested batch size", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "5" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate UUIDs" }))
    expect(outputValue()).toMatch(new RegExp(`^${oneUuid}(\\n${oneUuid}){4}$`))
    expect(screen.getByRole("heading", { name: "Generated UUIDs (5)" })).toBeVisible()
  })

  it("applies uppercase without dropping the version and variant bits", () => {
    renderTool()
    fireEvent.click(screen.getByLabelText("Uppercase"))
    fireEvent.click(screen.getByRole("button", { name: "Generate UUIDs" }))
    expect(outputValue()).toMatch(
      /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/,
    )
  })

  it("can emit hyphenless UUIDs", () => {
    renderTool()
    fireEvent.click(screen.getByLabelText("With hyphens"))
    fireEvent.click(screen.getByRole("button", { name: "Generate UUIDs" }))
    expect(outputValue()).toMatch(/^[0-9a-f]{32}$/)
  })

  it("clamps an out-of-range count", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Count"), { target: { value: "250" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate UUIDs" }))
    expect(screen.getByRole("heading", { name: "Generated UUIDs (100)" })).toBeVisible()
  })
})
