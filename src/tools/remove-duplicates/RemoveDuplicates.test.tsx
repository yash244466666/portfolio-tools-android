import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import RemoveDuplicates from "@/tools/remove-duplicates/RemoveDuplicates"

function resultText(value: string) {
  return screen.getByText((_, element) => element?.tagName === "P" && element.textContent === value)
}

describe("Remove Duplicates interactions", () => {
  it("dedupes lines case-sensitively by default and reports counts", () => {
    render(
      <PlatformProvider>
        <RemoveDuplicates />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByRole("textbox", { name: "Lines" }), {
      target: { value: "b\na\nb\na\nc" },
    })
    expect(resultText("b\na\nc")).toBeVisible()
    expect(screen.getByText(/5 in; 3 unique; 2 removed/)).toBeVisible()
  })

  it("dedupes words and supports sorting plus case-insensitive comparison", () => {
    render(
      <PlatformProvider>
        <RemoveDuplicates />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("radio", { name: "Words" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Words" }), {
      target: { value: "the cat THE cat" },
    })
    fireEvent.click(screen.getByLabelText("Case sensitive"))
    expect(resultText("the cat")).toBeVisible()

    fireEvent.click(screen.getByRole("radio", { name: "Lines" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Lines" }), {
      target: { value: "banana\napple" },
    })
    fireEvent.click(screen.getByRole("radio", { name: "Lines" }))
    fireEvent.click(screen.getByLabelText("Sort unique output"))
    expect(resultText("apple\nbanana")).toBeVisible()
  })

  it("rejects input beyond the character limit", () => {
    render(
      <PlatformProvider>
        <RemoveDuplicates />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByRole("textbox", { name: "Lines" }), {
      target: { value: "a".repeat(1_000_001) },
    })
    expect(screen.getAllByRole("alert")[0]).toHaveTextContent("1,000,000 character limit")
    expect(screen.getAllByText(/Shorten it to deduplicate/).length).toBeGreaterThan(0)
  })
})
