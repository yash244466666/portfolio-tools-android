import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import MorseCodeTranslator from "@/tools/morse-code-translator/MorseCodeTranslator"

function renderTool() {
  return render(
    <PlatformProvider>
      <MorseCodeTranslator />
    </PlatformProvider>,
  )
}

describe("Morse Code Translator interactions", () => {
  it("translates text to Morse in the default direction", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "SOS" } })
    fireEvent.click(screen.getByRole("button", { name: "Convert" }))
    expect(screen.getByLabelText("Converted output")).toHaveValue("... --- ...")
  })

  it("translates Morse back to text in the reverse direction", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Morse to Text" }))
    fireEvent.change(screen.getByLabelText("Input text"), {
      target: { value: ".... . .-.. .-.. --- / .-- --- .-. .-.. -.." },
    })
    fireEvent.click(screen.getByRole("button", { name: "Convert" }))
    expect(screen.getByLabelText("Converted output")).toHaveValue("HELLO WORLD")
  })

  it("discloses dropped characters instead of failing silently", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "Hi %" } })
    fireEvent.click(screen.getByRole("button", { name: "Convert" }))
    expect(screen.getByText(/Some characters could not be translated/)).toBeVisible()
    expect(screen.getByText(/Some characters could not be translated/)).toHaveTextContent("%")
  })

  it("clears the input, output, and dropped-character notice", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Input text"), { target: { value: "Hi %" } })
    fireEvent.click(screen.getByRole("button", { name: "Convert" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Input text")).toHaveValue("")
    expect(screen.getByLabelText("Converted output")).toHaveValue("")
    expect(screen.queryByText(/Some characters could not be translated/)).toBeNull()
  })

  it("discloses that audio playback is not included", () => {
    renderTool()
    expect(screen.getByText(/audio playback preview is not included/i)).toBeVisible()
  })
})
