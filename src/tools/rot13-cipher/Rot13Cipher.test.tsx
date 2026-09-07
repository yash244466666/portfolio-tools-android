import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import Rot13Cipher from "@/tools/rot13-cipher/Rot13Cipher"

function renderTool() {
  return render(
    <PlatformProvider>
      <Rot13Cipher />
    </PlatformProvider>,
  )
}

describe("ROT13 Cipher interactions", () => {
  it("encodes with the default ROT13 shift", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "Hello" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    expect(screen.getByLabelText("Converted output")).toHaveValue("Uryyb")
  })

  it("decodes with the selected shift", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Shift amount"), { target: { value: "3" } })
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "Khoor" } })
    fireEvent.click(screen.getByRole("button", { name: "Decode" }))
    expect(screen.getByLabelText("Converted output")).toHaveValue("Hello")
  })

  it("clears both panels", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "Hello" } })
    fireEvent.click(screen.getByRole("button", { name: "Encode" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Input text")).toHaveValue("")
    expect(screen.getByLabelText("Converted output")).toHaveValue("")
  })

  it("warns that the cipher is not secret protection", () => {
    renderTool()
    expect(screen.getByText(/Do not use this tool to protect secrets/i)).toBeVisible()
  })
})
