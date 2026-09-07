import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CharacterCounter from "@/tools/character-counter/CharacterCounter"

describe("Character Counter interactions", () => {
  it("counts characters as code points and leads with the character cards", () => {
    render(
      <PlatformProvider>
        <CharacterCounter />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Text")
    fireEvent.change(input, { target: { value: "a👍b c" } })

    // Regression: the upstream UTF-16 count would have shown 6 here.
    const charactersCard = screen.getByText("Characters").previousElementSibling
    expect(charactersCard).toHaveTextContent("5")
    const withoutSpacesCard = screen.getByText("Without spaces").previousElementSibling
    expect(withoutSpacesCard).toHaveTextContent("4")
    const wordsCard = screen.getByText("Words").previousElementSibling
    expect(wordsCard).toHaveTextContent("2")
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <CharacterCounter />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Text")
    fireEvent.change(input, { target: { value: "a".repeat(1_000_001) } })

    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })
})
