import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TextDiff from "@/tools/text-diff/TextDiff"

function setOriginal(value: string) {
  fireEvent.change(screen.getByLabelText("Original text"), { target: { value } })
}

function setModified(value: string) {
  fireEvent.change(screen.getByLabelText("Modified text"), { target: { value } })
}

describe("TextDiff interactions", () => {
  it("summarizes added, removed, and unchanged line counts", () => {
    render(
      <PlatformProvider>
        <TextDiff />
      </PlatformProvider>,
    )
    setOriginal("a\nb\nc")
    setModified("a\nx\nc\nnew")
    expect(screen.getByText("3 lines added, 2 lines removed, 1 line unchanged.")).toBeVisible()
  })

  it("marks added and removed lines so the diff reads without color", () => {
    render(
      <PlatformProvider>
        <TextDiff />
      </PlatformProvider>,
    )
    setOriginal("same\nold")
    setModified("same\nnew")
    expect(screen.getByText("- old")).toBeVisible()
    expect(screen.getByText("+ new")).toBeVisible()
    // Text normalization collapses the leading marker spaces to "same".
    expect(screen.getByText("same")).toBeVisible()
  })

  it("reports identical texts", () => {
    render(
      <PlatformProvider>
        <TextDiff />
      </PlatformProvider>,
    )
    setOriginal("a\nb")
    setModified("a\nb")
    expect(screen.getByText("Result — no line differences")).toBeVisible()
    expect(screen.getByText("The texts are identical.")).toBeVisible()
  })

  it("blocks over-limit sides with a field error", () => {
    render(
      <PlatformProvider>
        <TextDiff />
      </PlatformProvider>,
    )
    setOriginal(`${"x".repeat(10_001)}`)
    expect(screen.getByText(/The original text is limited to 10,000 characters/)).toBeVisible()
    expect(screen.queryByText("Result")).toBeNull()
  })

  it("clears both sides", () => {
    render(
      <PlatformProvider>
        <TextDiff />
      </PlatformProvider>,
    )
    setOriginal("a")
    setModified("b")
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Original text")).toHaveValue("")
    expect(screen.getByLabelText("Modified text")).toHaveValue("")
  })
})
