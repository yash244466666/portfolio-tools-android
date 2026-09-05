import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import HashGenerator from "@/tools/hash-generator/HashGenerator"

describe("Hash Generator interactions", () => {
  it("generates standard digests and resets sensitive input", async () => {
    render(
      <PlatformProvider>
        <HashGenerator />
      </PlatformProvider>,
    )

    const input = screen.getByLabelText("Text to hash")
    fireEvent.change(input, { target: { value: "abc" } })
    fireEvent.click(screen.getByRole("button", { name: "Generate hashes" }))

    expect(
      await screen.findByText("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"),
    ).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Reset" }))
    expect(input).toHaveValue("")
    expect(screen.queryByText(/ba7816bf8f01cfea/)).not.toBeInTheDocument()
  })
})
