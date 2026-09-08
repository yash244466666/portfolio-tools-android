import { encodeText } from "./text-binary"
import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import TextBinaryConverter from "./TextBinaryConverter"

function renderTool() {
  render(
    <PlatformProvider>
      <TextBinaryConverter />
    </PlatformProvider>,
  )
}

describe("TextBinaryConverter", () => {
  it("encodes known UTF-8 vectors as you type", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Number base (encode)"), {
      target: { value: "decimal" },
    })
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "é" } })
    expect(screen.getByLabelText("Encoded values (from text)")).toHaveValue("195 169")
  })

  it("round-trips multi-byte characters through the decode panel", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "東京" } })
    fireEvent.change(screen.getByLabelText("Encoded values (to decode)"), {
      target: { value: encodeText("東京", "binary", "space") },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/decoded 6 bytes/i)
    expect(screen.getByLabelText("Decoded text")).toHaveValue("東京")
  })

  it("follows base and delimiter changes in both panels", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "é" } })
    fireEvent.change(screen.getByLabelText("Number base (encode)"), {
      target: { value: "binary" },
    })
    expect(screen.getByLabelText("Encoded values (from text)")).toHaveValue("11000011 10101001")
    fireEvent.change(screen.getByLabelText("Delimiter (encode)"), {
      target: { value: "none" },
    })
    expect(screen.getByLabelText("Encoded values (from text)")).toHaveValue("1100001110101001")
  })

  it("reports malformed and non-UTF-8 decode input with visible alerts", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Encoded values (to decode)"), {
      target: { value: "11000011 banana" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/not a valid binary/i)
    fireEvent.change(screen.getByLabelText("Encoded values (to decode)"), {
      target: { value: "255" },
    })
    fireEvent.change(screen.getByLabelText("Encoded values (to decode)"), {
      target: { value: "11000011 10101001 11111111" },
    })
    expect(screen.getByRole("status")).toHaveTextContent(/not valid UTF-8/i)
  })

  it("clears both panels back to the empty state", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Text"), { target: { value: "hi" } })
    fireEvent.click(screen.getByRole("button", { name: /clear both/i }))
    expect(screen.getByLabelText("Text")).toHaveValue("")
    expect(screen.getByLabelText("Encoded values (from text)")).toHaveValue("")
  })
})
