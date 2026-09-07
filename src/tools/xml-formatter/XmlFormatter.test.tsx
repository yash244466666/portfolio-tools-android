import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import XmlFormatter from "./XmlFormatter"

function renderTool() {
  return render(
    <PlatformProvider>
      <XmlFormatter />
    </PlatformProvider>,
  )
}

function resultText() {
  const pre = document.querySelector("pre")
  return pre === null ? "" : (pre.textContent ?? "")
}

describe("XmlFormatter", () => {
  it("formats pasted XML into the result panel", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("XML input"), {
      target: { value: "<root><child><leaf>text</leaf></child></root>" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(resultText()).toBe(
      ["<root>", "  <child>", "    <leaf>text</leaf>", "  </child>", "</root>"].join("\n"),
    )
    expect(screen.queryByText(/not well-formed/)).not.toBeInTheDocument()
  })

  it("minifies whitespace between tags", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("XML input"), {
      target: { value: "<root>\n  <child>text</child>\n</root>" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    expect(resultText()).toBe("<root><child>text</child></root>")
  })

  it("reports malformed XML instead of output", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("XML input"), { target: { value: "<a><b></a>" } })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(screen.getByText("The XML is not well-formed.")).toBeInTheDocument()
    expect(resultText()).toBe("")
  })

  it("hides the result panel until an action produces output", () => {
    renderTool()
    expect(resultText()).toBe("")
    fireEvent.change(screen.getByLabelText("XML input"), { target: { value: "<root/>" } })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(resultText()).not.toBe("")
  })

  it("clears input, output, and errors", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("XML input"), { target: { value: "<a/>" } })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("XML input")).toHaveValue("")
    expect(resultText()).toBe("")
    expect(screen.queryByText(/not well-formed/)).not.toBeInTheDocument()
  })
})
