import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import OpenGraphPreview from "./OpenGraphPreview"

const head = [
  "<meta property=\"og:title\" content=\"Launch day\" />",
  "<meta property=\"og:description\" content=\"Everything new.\" />",
  "<meta name=\"twitter:card\" content=\"summary_large_image\" />",
].join("\n")

function renderTool() {
  render(
    <PlatformProvider>
      <OpenGraphPreview />
    </PlatformProvider>,
  )
}

describe("OpenGraphPreview interactions", () => {
  it("starts in the empty state", () => {
    renderTool()
    expect(screen.getByText(/Paste the head section/)).toBeVisible()
  })

  it("previews extracted tags as text without fetching anything", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("HTML input"), { target: { value: head } })
    expect(screen.getByText("Launch day")).toBeVisible()
    expect(screen.getByText("Everything new.")).toBeVisible()
    expect(screen.getByText("summary_large_image")).toBeVisible()
    expect(screen.getByText(/never downloaded/)).toBeVisible()
    expect(document.querySelector("pre")?.textContent).toContain(
      "<meta property=\"og:title\" content=\"Launch day\" />",
    )
  })

  it("explains when no social tags exist in the pasted markup", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("HTML input"), {
      target: { value: "<head><title>Nope</title></head>" },
    })
    expect(screen.getByRole("alert")).toHaveTextContent("No Open Graph or Twitter Card")
  })
})