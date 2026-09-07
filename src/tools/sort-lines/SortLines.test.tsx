import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import SortLines from "@/tools/sort-lines/SortLines"

function resultText(value: string) {
  return screen.getByText((_, element) => element?.tagName === "P" && element.textContent === value)
}

describe("Sort Lines interactions", () => {
  it("sorts lines live and reports counts", () => {
    render(
      <PlatformProvider>
        <SortLines />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Lines"), {
      target: { value: "banana\nApple\ncherry" },
    })
    expect(resultText("Apple\nbanana\ncherry")).toBeVisible()
    expect(screen.getByText(/3 lines in; 0 removed/)).toBeVisible()

    fireEvent.click(screen.getByLabelText("Z → A"))
    expect(resultText("cherry\nbanana\nApple")).toBeVisible()
  })

  it("removes blank and duplicate lines before sorting", () => {
    render(
      <PlatformProvider>
        <SortLines />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Lines"), {
      target: { value: "b\n\nb\n  \na" },
    })
    fireEvent.click(screen.getByLabelText("Remove blank or whitespace-only lines"))
    fireEvent.click(screen.getByLabelText("Remove duplicate lines"))
    expect(resultText("a\nb")).toBeVisible()
    expect(screen.getByText(/5 lines in; 3 removed/)).toBeVisible()
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <SortLines />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Lines"), { target: { value: "a".repeat(1_000_001) } })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.getAllByText(/Shorten it to sort/).length).toBeGreaterThan(0)
  })
})
