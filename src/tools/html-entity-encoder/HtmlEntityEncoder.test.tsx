import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import HtmlEntityEncoder from "@/tools/html-entity-encoder/HtmlEntityEncoder"

function renderTool() {
  return render(
    <PlatformProvider>
      <HtmlEntityEncoder />
    </PlatformProvider>,
  )
}

describe("HTML Entity Encoder interactions", () => {
  it("encodes the reserved characters as the user types", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: '<a href="x">' } })
    expect(screen.getByLabelText("Converted output")).toHaveValue("&lt;a href=&quot;x&quot;&gt;")
  })

  it("decodes named and numeric entities without parsing HTML", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Decode Entities" }))
    fireEvent.change(screen.getByLabelText("Input text"), {
      target: { value: "&lt;b&gt;&amp;&lt;/b&gt; &#65; &copy;" },
    })
    expect(screen.getByLabelText("Converted output")).toHaveValue("<b>&</b> A ©")
  })

  it("escape HTML keeps the apostrophe untouched", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Escape HTML" }))
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "&<>\"'" } })
    expect(screen.getByLabelText("Converted output")).toHaveValue("&amp;&lt;&gt;&quot;'")
  })

  it("leaves malformed entities unchanged while decoding", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Decode Entities" }))
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "&nope; &#zz;" } })
    expect(screen.getByLabelText("Converted output")).toHaveValue("&nope; &#zz;")
  })
})
