import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import SqlFormatter from "./SqlFormatter"

function renderTool() {
  return render(
    <PlatformProvider>
      <SqlFormatter />
    </PlatformProvider>,
  )
}

function resultText() {
  const pre = document.querySelector("pre")
  return pre === null ? "" : (pre.textContent ?? "")
}

describe("SqlFormatter", () => {
  it("formats SQL in the default dialect", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select id, name from users where active = 1" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(resultText()).toBe("select\n  id,\n  name\nfrom\n  users\nwhere\n  active = 1")
  })

  it("switches to the PostgreSQL dialect", () => {
    renderTool()
    fireEvent.click(screen.getByLabelText("PostgreSQL"))
    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select $$tagged$$ from t" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(resultText()).toContain("$$tagged$$")
  })

  it("minifies onto one line", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select id from users" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Minify" }))
    expect(resultText()).toBe("select id from users")
  })

  it("reports a parse failure with a fixed message and no output", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SQL input"), {
      target: { value: "select 'oops from t" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    expect(screen.getByText("The SQL could not be parsed for formatting.")).toBeInTheDocument()
    expect(resultText()).toBe("")
  })

  it("clears input, output, and errors", () => {
    renderTool()
    fireEvent.change(screen.getByLabelText("SQL input"), { target: { value: "select 1" } })
    fireEvent.click(screen.getByRole("button", { name: "Format" }))
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText("SQL input")).toHaveValue("")
    expect(resultText()).toBe("")
  })
})
