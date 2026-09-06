import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import MarkdownPreview from "@/tools/markdown-preview/MarkdownPreview"

function typeMarkdown(value: string) {
  fireEvent.change(screen.getByLabelText("Markdown input"), { target: { value } })
}

describe("Markdown Preview interactions", () => {
  it("previews typed Markdown and clears with reset", async () => {
    render(
      <PlatformProvider>
        <MarkdownPreview />
      </PlatformProvider>,
    )

    expect(screen.getByText("The preview appears here as you type.")).toBeVisible()

    typeMarkdown("# Title\n\n**bold** body")
    expect(await screen.findByRole("heading", { level: 1, name: "Title" })).toBeVisible()
    expect(screen.getByText((_, element) => element?.textContent === "bold body")).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    await waitFor(() => {
      expect(screen.getByLabelText("Markdown input")).toHaveValue("")
      expect(screen.getByText("The preview appears here as you type.")).toBeVisible()
    })
  })

  it("removes hostile payloads from the live preview", async () => {
    render(
      <PlatformProvider>
        <MarkdownPreview />
      </PlatformProvider>,
    )

    typeMarkdown("<script>alert(1)</script>\n\nsafe paragraph")
    expect(
      await screen.findByText((_, element) => element?.textContent === "safe paragraph"),
    ).toBeVisible()
    const preview = screen.getByRole("region", { name: "Rendered preview" })
    expect(preview.textContent).not.toContain("alert")
    expect(preview.innerHTML).not.toContain("<script")
  })

  it("rejects oversized input without rendering and keeps the last preview", async () => {
    render(
      <PlatformProvider>
        <MarkdownPreview />
      </PlatformProvider>,
    )

    typeMarkdown("# keep")
    await screen.findByRole("heading", { level: 1, name: "keep" })

    const oversized = "# too large\n" + "a".repeat(256 * 1024)
    typeMarkdown(oversized)

    await screen.findByText(/exceeds the 256 KiB input limit/)
    expect(screen.getByText("Shorten the Markdown to see the preview.")).toBeVisible()
    expect(screen.queryByRole("heading", { level: 1, name: "keep" })).not.toBeInTheDocument()
  })
})
