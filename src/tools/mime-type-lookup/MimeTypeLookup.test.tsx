import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import MimeTypeLookup from "@/tools/mime-type-lookup/MimeTypeLookup"

function renderTool() {
  return render(
    <PlatformProvider>
      <MimeTypeLookup />
    </PlatformProvider>,
  )
}

describe("MIME Type Lookup interactions", () => {
  it("lists extension-to-MIME rows with descriptions by default", () => {
    renderTool()
    expect(screen.getAllByText(".pdf → application/pdf").length).toBe(1)
    expect(screen.getByText("PDF document")).toBeVisible()
  })

  it("searches by extension in extension mode", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search extensions"), {
      target: { value: "jpg" },
    })
    expect(screen.getByText(".jpg → image/jpeg")).toBeVisible()
    expect(screen.queryByText(".pdf → application/pdf")).not.toBeInTheDocument()
  })

  it("switches direction to MIME to extension", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "MIME to Extension" }))
    fireEvent.change(screen.getByLabelText("Search MIME types"), {
      target: { value: "image/png" },
    })
    expect(screen.getByText(".png → image/png")).toBeVisible()
    expect(screen.queryByText(".pdf → application/pdf")).not.toBeInTheDocument()
  })

  it("shows an empty state when nothing matches", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search extensions"), {
      target: { value: "zzzz" },
    })
    expect(screen.getByText(/No MIME types match/)).toBeVisible()
  })
})
