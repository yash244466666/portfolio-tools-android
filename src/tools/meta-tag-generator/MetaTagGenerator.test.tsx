import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import MetaTagGenerator from "@/tools/meta-tag-generator/MetaTagGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <MetaTagGenerator />
    </PlatformProvider>,
  )
}

describe("Meta Tag Generator interactions", () => {
  it("starts with the default viewport and robots output", () => {
    renderTool()
    expect(screen.getByText(/width=device-width, initial-scale=1/)).toBeVisible()
    expect(screen.getByText(/index, follow/)).toBeVisible()
  })

  it("generates a title tag and viewport default", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My Website" } })
    const output = screen.getByText(/<title>My Website<\/title>/)
    expect(output).toBeVisible()
    expect(screen.getByText(/width=device-width, initial-scale=1/)).toBeVisible()
  })

  it("escapes quotes so a value cannot break the generated markup", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: 'My "Site"' } })
    expect(screen.getByText(/<title>My &quot;Site&quot;<\/title>/)).toBeVisible()
  })

  it("enables the Open Graph block when an OG field is set", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("og:image"), {
      target: { value: "https://example.com/image.png" },
    })
    expect(screen.getByText(/<!-- Open Graph \/ Facebook -->/)).toBeVisible()
    expect(screen.getByText(/property="og:type"/)).toBeVisible()
  })

  it("switches the twitter card and emits the block when a Twitter field is set", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "summary" }))
    fireEvent.change(screen.getByLabelText("twitter:title"), { target: { value: "T" } })
    expect(screen.getByText(/<meta name="twitter:card" content="summary" \/>/)).toBeVisible()
  })

  it("resets all fields to the defaults", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "My Website" } })
    fireEvent.click(screen.getByRole("button", { name: "Reset all fields" }))
    expect(screen.queryByText(/<title>/)).not.toBeInTheDocument()
    expect(screen.getByText(/width=device-width, initial-scale=1/)).toBeVisible()
  })
})
