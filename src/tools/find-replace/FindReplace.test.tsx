import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import FindReplace from "@/tools/find-replace/FindReplace"
import { maximumFindLength } from "@/tools/find-replace/find-replace"

function renderTool() {
  return render(
    <PlatformProvider>
      <FindReplace />
    </PlatformProvider>,
  )
}

/**
 * Literal mode is the default and scans synchronously, so these cases need no
 * Worker. Regex mode runs through the terminable regex Worker and is covered by
 * the pure suite plus the Regex Tester worker tests.
 */
describe("Find & Replace interactions", () => {
  it("reports literal matches and builds the replacement output", () => {
    renderTool()

    fireEvent.change(screen.getByLabelText("Find"), { target: { value: "cat" } })
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "dog" } })
    fireEvent.change(screen.getByLabelText("Source text"), {
      target: { value: "cat cat\ncatalog" },
    })

    // "catalog" also contains the literal, so the count is 3, not 2.
    expect(screen.getByText("3 matches")).toBeVisible()
    expect(screen.getByLabelText("Replacement result")).toHaveValue("dog dog\ndogalog")
  })

  it("honours the case-sensitive and whole-word options", () => {
    renderTool()

    fireEvent.change(screen.getByLabelText("Find"), { target: { value: "cat" } })
    fireEvent.change(screen.getByLabelText("Source text"), {
      target: { value: "Cat cat catalog" },
    })
    expect(screen.getByText("3 matches")).toBeVisible()

    fireEvent.click(screen.getByLabelText("Case sensitive"))
    expect(screen.getByText("2 matches")).toBeVisible()

    fireEvent.click(screen.getByLabelText("Whole word"))
    expect(screen.getByText("1 match")).toBeVisible()
  })

  it("applies replacements back into the source and clears the pattern", () => {
    renderTool()

    fireEvent.change(screen.getByLabelText("Find"), { target: { value: "cat" } })
    fireEvent.change(screen.getByLabelText("Replace with"), { target: { value: "dog" } })
    fireEvent.change(screen.getByLabelText("Source text"), { target: { value: "a cat" } })

    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }))

    expect(screen.getByLabelText("Source text")).toHaveValue("a dog")
    expect(screen.getByLabelText("Find")).toHaveValue("")
    expect(screen.getByLabelText("Replace with")).toHaveValue("")
    // The result panel is driven by an active search, so it unmounts on apply.
    expect(screen.queryByLabelText("Replacement result")).not.toBeInTheDocument()
  })

  it("clears every input and option", () => {
    renderTool()

    fireEvent.change(screen.getByLabelText("Find"), { target: { value: "cat" } })
    fireEvent.change(screen.getByLabelText("Source text"), { target: { value: "a cat" } })
    fireEvent.click(screen.getByLabelText("Whole word"))

    fireEvent.click(screen.getByRole("button", { name: "Clear" }))

    expect(screen.getByLabelText("Find")).toHaveValue("")
    expect(screen.getByLabelText("Source text")).toHaveValue("")
    expect(screen.getByLabelText("Whole word")).not.toBeChecked()
    expect(screen.queryByLabelText("Replacement result")).not.toBeInTheDocument()
  })

  it("rejects an over-limit find pattern with a recovery instruction", () => {
    renderTool()

    fireEvent.change(screen.getByLabelText("Find"), {
      target: { value: "a".repeat(maximumFindLength + 1) },
    })
    fireEvent.change(screen.getByLabelText("Source text"), { target: { value: "aaa" } })

    // The over-limit state is announced twice: once by the Field's own error
    // region and once by the tool's standalone alert.
    const alerts = screen.getAllByRole("alert")
    expect(alerts[0]).toHaveTextContent(
      `Find patterns are limited to ${maximumFindLength} characters`,
    )
    expect(screen.queryByLabelText("Replacement result")).not.toBeInTheDocument()
  })
})
