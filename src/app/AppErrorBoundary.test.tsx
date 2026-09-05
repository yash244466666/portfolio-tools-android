import { render, screen } from "@testing-library/react"
import { vi } from "vitest"
import { AppErrorBoundary } from "@/app/AppErrorBoundary"

function BrokenScreen(): never {
  throw new Error("test render failure")
}

test("offers a private recovery path after a render failure", () => {
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)

  render(
    <AppErrorBoundary>
      <BrokenScreen />
    </AppErrorBoundary>,
  )

  expect(screen.getByRole("heading", { name: "Yash Tools needs to reload" })).toBeVisible()
  expect(screen.getByRole("button", { name: "Reopen catalog" })).toBeVisible()
  expect(screen.getByText(/not uploaded or included in an automatic report/i)).toBeVisible()

  consoleError.mockRestore()
})
