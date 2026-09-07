import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import HttpStatusCodes from "@/tools/http-status-codes/HttpStatusCodes"

function renderTool() {
  return render(
    <PlatformProvider>
      <HttpStatusCodes />
    </PlatformProvider>,
  )
}

describe("HTTP Status Codes interactions", () => {
  it("lists codes with names, descriptions, and class badges", () => {
    renderTool()
    expect(screen.getByText("OK")).toBeVisible()
    expect(screen.getByText(/The request has succeeded\./)).toBeVisible()
    expect(screen.getByText("404")).toBeVisible()
    expect(screen.getByText("Not Found")).toBeVisible()
  })

  it("narrows results by query", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search status codes"), {
      target: { value: "teapot" },
    })
    expect(screen.getByText("I'm a Teapot")).toBeVisible()
    expect(screen.queryByText("OK")).not.toBeInTheDocument()
  })

  it("narrows results by class tab", () => {
    renderTool()
    fireEvent.click(screen.getByRole("radio", { name: "5xx" }))
    expect(screen.getByText("Service Unavailable")).toBeVisible()
    expect(screen.queryByText("OK")).not.toBeInTheDocument()
  })

  it("shows an empty state when nothing matches", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("Search status codes"), {
      target: { value: "zzzz" },
    })
    expect(screen.getByText(/No status codes match/)).toBeVisible()
  })
})
