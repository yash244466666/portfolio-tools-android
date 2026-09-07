import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import ReverseText from "@/tools/reverse-text/ReverseText"

function typeText(value: string) {
  fireEvent.change(screen.getByLabelText("Text"), { target: { value } })
}

describe("Reverse Text interactions", () => {
  it("reverses characters by default and switches modes", () => {
    render(
      <PlatformProvider>
        <ReverseText />
      </PlatformProvider>,
    )

    expect(screen.getByText(/Enter text above and pick a mode/i)).toBeVisible()

    typeText("hello")
    expect(screen.getByText("olleh")).toBeVisible()

    fireEvent.click(screen.getByLabelText("Words"))
    expect(screen.getByText(/Reverse word order within each line/i)).toBeVisible()
    typeText("hello brave world")
    expect(screen.getByText("world brave hello")).toBeVisible()

    fireEvent.click(screen.getByLabelText("Lines"))
    typeText("one\ntwo")
    // The result spans lines, so assert its raw text rather than a string query.
    const resultParagraph = screen.getByText(
      (_, element) => element?.classList.contains("font-mono") === true,
    )
    expect(resultParagraph.textContent).toBe("two\none")
  })

  it("keeps emoji intact while reversing", () => {
    render(
      <PlatformProvider>
        <ReverseText />
      </PlatformProvider>,
    )

    typeText("a👍")
    expect(screen.getByText("👍a")).toBeVisible()
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <ReverseText />
      </PlatformProvider>,
    )

    typeText("a".repeat(1_000_001))
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument()
  })
})
