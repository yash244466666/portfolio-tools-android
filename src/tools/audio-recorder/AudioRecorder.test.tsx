import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import AudioRecorder from "./AudioRecorder"

function renderTool() {
  render(
    <PlatformProvider>
      <AudioRecorder />
    </PlatformProvider>,
  )
}

describe("Audio Recorder interactions", () => {
  it("discloses the offline-only, in-memory-only behavior up front", () => {
    renderTool()
    expect(screen.getByRole("status")).toHaveTextContent(/offline-only/i)
    expect(screen.getByText(/never written to storage unless you export/i)).toBeVisible()
    expect(screen.getByText(/10 minutes or 32 MB/i)).toBeVisible()
    expect(screen.getByRole("button", { name: /start recording/i })).toBeEnabled()
  })

  it("surfaces the unsupported state when the environment has no capture stack", async () => {
    renderTool()
    fireEvent.click(screen.getByRole("button", { name: /start recording/i }))
    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/recording not supported/i)
    })
    expect(screen.getByRole("status")).toHaveTextContent(/unavailable right now/i)
    expect(screen.getByRole("button", { name: /start recording/i })).toBeEnabled()
  })

  it("hides the export panel until a take exists", () => {
    renderTool()
    expect(screen.queryByRole("button", { name: /save webm/i })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /save wav/i })).not.toBeInTheDocument()
  })
})
