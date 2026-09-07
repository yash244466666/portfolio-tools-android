import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import HashDiff from "@/tools/hash-diff/HashDiff"

function typeFirst(value: string) {
  fireEvent.change(screen.getByLabelText("First text"), { target: { value } })
}

function typeSecond(value: string) {
  fireEvent.change(screen.getByLabelText("Second text"), { target: { value } })
}

describe("Hash Diff interactions", () => {
  it("disables comparison until both texts are present", () => {
    render(
      <PlatformProvider>
        <HashDiff />
      </PlatformProvider>,
    )

    expect(screen.getByRole("button", { name: "Compare Hashes" })).toBeDisabled()
    typeFirst("abc")
    expect(screen.getByRole("button", { name: "Compare Hashes" })).toBeDisabled()
    typeSecond("abc")
    expect(screen.getByRole("button", { name: "Compare Hashes" })).toBeEnabled()
  })

  it("reports identical verdicts with matching digests for equal texts", async () => {
    render(
      <PlatformProvider>
        <HashDiff />
      </PlatformProvider>,
    )

    typeFirst("abc")
    typeSecond("abc")
    fireEvent.click(screen.getByRole("button", { name: "Compare Hashes" }))

    await waitFor(() => {
      expect(screen.getByText("Result — identical")).toBeVisible()
    })
    expect(screen.getByText(/IDENTICAL — every algorithm produced the same digest/i)).toBeVisible()
    // SHA-1 of "abc", the published NIST vector.
    expect(screen.getAllByText("a9993e364706816aba3e25717850c26c9cd0d89d")).toHaveLength(2)
    expect(screen.getAllByText("MATCH")).toHaveLength(3)
    expect(screen.getByText("SHA-1 (legacy)")).toBeVisible()
  })

  it("reports DIFFERENT and clears the result when either text changes", async () => {
    render(
      <PlatformProvider>
        <HashDiff />
      </PlatformProvider>,
    )

    typeFirst("abc")
    typeSecond("abd")
    fireEvent.click(screen.getByRole("button", { name: "Compare Hashes" }))
    await waitFor(() => {
      expect(screen.getByText("Result — different")).toBeVisible()
    })
    // Whole-text digests: any text difference makes every algorithm disagree.
    expect(screen.getAllByText("DIFFERENT")).toHaveLength(3)

    // Editing either side drops the stale result.
    typeSecond("abc")
    expect(screen.queryByText("Result — different")).toBeNull()
  })
})
