import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import AsciiTable from "@/tools/ascii-table/AsciiTable"

function renderTool() {
  return render(
    <PlatformProvider>
      <AsciiTable />
    </PlatformProvider>,
  )
}

describe("ASCII Table interactions", () => {
  it("renders the table with base columns for oracle rows", () => {
    renderTool()
    const table = screen.getByRole("table")
    expect(table).toBeVisible()
    expect(screen.getByText("Uppercase A")).toBeVisible()
    expect(screen.getByRole("button", { name: "Copy 65 character result" })).toBeVisible()
  })

  it("narrows by decimal, hex, and description", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search ASCII"), { target: { value: "41" } })
    expect(screen.getByText("Right parenthesis")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Search ASCII"), { target: { value: "0x41" } })
    expect(screen.getByText("Uppercase A")).toBeVisible()
    fireEvent.change(screen.getByLabelText("Search ASCII"), { target: { value: "delete" } })
    expect(screen.getByText("Delete")).toBeVisible()
    expect(screen.queryByText("Uppercase A")).not.toBeInTheDocument()
  })

  it("marks control codes as mnemonics", () => {
    renderTool()
    expect(screen.getByText("NUL")).toBeVisible()
    expect(screen.getByText("Null")).toBeVisible()
  })

  it("shows an empty state when nothing matches", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search ASCII"), { target: { value: "zzzz" } })
    expect(screen.getByText(/No characters match/)).toBeVisible()
  })
})
