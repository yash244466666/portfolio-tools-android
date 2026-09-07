import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import CssAnimationGenerator from "@/tools/css-animation-generator/CssAnimationGenerator"

function renderTool() {
  return render(
    <PlatformProvider>
      <CssAnimationGenerator />
    </PlatformProvider>,
  )
}

function getPre(): HTMLElement | null {
  return document.querySelector("pre")
}

describe("CSS Animation Generator interactions", () => {
  it("renders the default rule with its keyframes and copy affordance", () => {
    renderTool()
    expect(getPre()?.textContent).toContain("animation: fadeIn 1s ease 0s 1;")
    expect(getPre()?.textContent).toContain("@keyframes fadeIn {")
    expect(screen.getByRole("button", { name: "Copy CSS result" })).toBeVisible()
  })

  it("switches animation type and timing through the radios", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "Bounce" }))
    fireEvent.click(screen.getByRole("radio", { name: "linear" }))
    expect(getPre()?.textContent).toContain("animation: bounce 1s linear 0s 1;")
    expect(getPre()?.textContent).toContain("@keyframes bounce {")
  })

  it("maps zero iterations to infinite and flags invalid text", () => {
    renderTool()
    const iterations = screen.getByLabelText("Iterations")
    fireEvent.change(iterations, { target: { value: "0" } })
    expect(getPre()?.textContent).toContain("infinite;")
    fireEvent.change(iterations, { target: { value: "2.5" } })
    expect(screen.getByText("Whole iterations are used; 0 means infinite.")).toBeVisible()
  })

  it("clamps duration and delay to the slider bounds", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Duration (s)"), { target: { value: "9" } })
    fireEvent.change(screen.getByLabelText("Delay (s)"), { target: { value: "7" } })
    expect(getPre()?.textContent).toContain("animation: fadeIn 5s ease 3s 1;")
  })

  it("toggles the preview between playing and paused", () => {
    renderTool()
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    expect(screen.getByRole("button", { name: "Resume" })).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    expect(screen.getByRole("button", { name: "Pause" })).toBeVisible()
  })
})
