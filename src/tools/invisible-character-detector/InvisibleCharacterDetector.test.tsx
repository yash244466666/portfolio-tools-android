import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import InvisibleCharacterDetector from "@/tools/invisible-character-detector/InvisibleCharacterDetector"

function typeText(value: string) {
  fireEvent.change(screen.getByLabelText("Text to scan"), { target: { value } })
}

describe("Invisible Character Detector interactions", () => {
  it("reports nothing for clean text and lists detected characters for hostile text", () => {
    render(
      <PlatformProvider>
        <InvisibleCharacterDetector />
      </PlatformProvider>,
    )

    expect(screen.getByText(/Enter text above to scan for zero-width characters/i)).toBeVisible()

    typeText("plain text")
    expect(screen.getByText("No invisible characters were detected in this text.")).toBeVisible()

    // U+200B zero-width space and U+202F narrow no-break space as escapes, so
    // this test source contains no raw invisible characters either.
    typeText("a\u200Bb c\u202Fd")
    expect(screen.getByText("2 invisible characters")).toBeVisible()
    expect(screen.getByText(/Zero-Width Space/)).toBeVisible()
    expect(screen.getByText(/U\+200B — 1 occurrence/)).toBeVisible()
    expect(screen.getByText(/Narrow No-Break Space/)).toBeVisible()
    expect(screen.getByText(/U\+202F — 1 occurrence/)).toBeVisible()
  })

  it("removes exactly the reported characters and keeps everything else", () => {
    render(
      <PlatformProvider>
        <InvisibleCharacterDetector />
      </PlatformProvider>,
    )

    typeText("a\u200Bb c\u202Fd")
    fireEvent.click(screen.getByRole("button", { name: "Remove all" }))
    const input = screen.getByLabelText("Text to scan")
    expect(input instanceof HTMLTextAreaElement ? input.value : "").toBe("ab cd")
    expect(screen.getByText(/Removed 2 invisible characters\./i)).toBeVisible()
    expect(screen.getByText("No invisible characters were detected in this text.")).toBeVisible()
  })

  it("clears the result when the text is emptied", () => {
    render(
      <PlatformProvider>
        <InvisibleCharacterDetector />
      </PlatformProvider>,
    )

    typeText("x\u200By")
    expect(screen.getByText("1 invisible character")).toBeVisible()
    typeText("")
    expect(screen.getByText(/Enter text above to scan/i)).toBeVisible()
    expect(screen.queryByRole("button", { name: "Remove all" })).toBeNull()
  })
})
