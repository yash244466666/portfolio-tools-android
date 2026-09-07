import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CsvJson from "@/tools/csv-json/CsvJson"

function setInput(value: string) {
  fireEvent.change(screen.getByLabelText(/CSV text|JSON text/), { target: { value } })
}

describe("CsvJson interactions", () => {
  it("converts CSV to JSON with header names", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    setInput("name,age\nAda,36")
    expect(screen.getByLabelText("Conversion result")).toHaveValue(
      '[\n  {\n    "name": "Ada",\n    "age": "36"\n  }\n]',
    )
  })

  it("keeps a quoted multi-line field in one row", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    setInput('note,text\n"two\nlines",ok')
    expect(screen.getByLabelText("Conversion result")).toHaveValue(
      '[\n  {\n    "note": "two\\nlines",\n    "text": "ok"\n  }\n]',
    )
  })

  it("discloses uneven rows instead of silently dropping cells", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    setInput("a,b\n1,2,3")
    expect(screen.getByText(/1 row had a different cell count/)).toBeVisible()
    expect(screen.getByLabelText("Conversion result")).toHaveValue(
      '[\n  {\n    "a": "1",\n    "b": "2",\n    "column-3": "3"\n  }\n]',
    )
  })

  it("switches direction to JSON to CSV and neutralizes formulas", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByLabelText("JSON to CSV"))
    setInput('[{"cmd":"=rm"}]')
    expect(screen.getByLabelText("Conversion result")).toHaveValue("cmd\n'=rm")
    expect(screen.getByText(/1 cell starting with/)).toBeVisible()
  })

  it("reports invalid CSV without a result panel", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    setInput('"unterminated')
    expect(screen.getByText(/missing its closing quote/)).toBeVisible()
    expect(screen.queryByLabelText("Conversion result")).toBeNull()
  })

  it("clears back to defaults", () => {
    render(
      <PlatformProvider>
        <CsvJson />
      </PlatformProvider>,
    )
    setInput("name,age\nAda,36")
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText(/CSV text|JSON text/)).toHaveValue("")
    expect(screen.queryByLabelText("Conversion result")).toBeNull()
  })
})
