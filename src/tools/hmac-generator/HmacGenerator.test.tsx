import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import HmacGenerator from "@/tools/hmac-generator/HmacGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <HmacGenerator />
    </PlatformProvider>,
  )
}

describe("HMAC Generator interactions", () => {
  it("matches the RFC 4231 test case 2 vector end to end", async () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "what do ya want for nothing?" },
    })
    fireEvent.change(screen.getByLabelText("Secret key"), { target: { value: "Jefe" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate HMAC" }))
    await waitFor(() => {
      expect(
        screen.getByText("5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"),
      ).toBeVisible()
    })
    expect(screen.getByRole("heading", { name: "HMAC-256" })).toBeVisible()
  })

  it("re-generates with a different algorithm on request", async () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Hi There" } })
    fireEvent.change(screen.getByLabelText("Secret key"), { target: { value: "Jefe" } })
    fireEvent.click(screen.getByRole("radio", { name: "SHA-512" }))
    fireEvent.click(screen.getByRole("button", { name: "Generate HMAC" }))
    await waitFor(() => {
      expect(screen.getByText(/^[0-9a-f]{128}$/)).toBeVisible()
    })
    expect(screen.getByRole("heading", { name: "HMAC-512" })).toBeVisible()
  })

  it("clears the message, secret, and output", async () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "message" } })
    fireEvent.change(screen.getByLabelText("Secret key"), { target: { value: "key" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate HMAC" }))
    await waitFor(() => {
      expect(screen.getByText(/^[0-9a-f]{64}$/)).toBeVisible()
    })
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("Message")).toHaveValue("")
    expect(screen.getByLabelText("Secret key")).toHaveValue("")
    expect(screen.queryByText(/^[0-9a-f]{64}$/)).toBeNull()
  })

  it("keeps the secret input out of autofill and spellcheck", () => {
    renderTool()
    const secret = screen.getByLabelText("Secret key")
    expect(secret).toHaveAttribute("autocomplete", "off")
    expect(secret).toHaveAttribute("spellcheck", "false")
  })
})
