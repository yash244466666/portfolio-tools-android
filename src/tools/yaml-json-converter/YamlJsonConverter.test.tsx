import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import YamlJsonConverter from "@/tools/yaml-json-converter/YamlJsonConverter"

function setInput(value: string) {
  fireEvent.change(screen.getByLabelText(/YAML text|JSON text/), { target: { value } })
}

describe("YamlJsonConverter interactions", () => {
  it("converts YAML to JSON live", () => {
    render(
      <PlatformProvider>
        <YamlJsonConverter />
      </PlatformProvider>,
    )
    setInput("name: Ada\nage: 36")
    expect(screen.getByLabelText("Conversion result")).toHaveValue(
      '{\n  "name": "Ada",\n  "age": 36\n}',
    )
  })

  it("switches direction and converts JSON to YAML", () => {
    render(
      <PlatformProvider>
        <YamlJsonConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByLabelText("JSON to YAML"))
    setInput('{"name":"Ada"}')
    expect(screen.getByLabelText("Conversion result")).toHaveValue("name: Ada\n")
  })

  it("rejects unsafe YAML types with an error", () => {
    render(
      <PlatformProvider>
        <YamlJsonConverter />
      </PlatformProvider>,
    )
    setInput("!!python/object:os.system\nx: 1")
    expect(screen.getByText(/The YAML is not valid/)).toBeVisible()
    expect(screen.queryByLabelText("Conversion result")).toBeNull()
  })

  it("reports invalid JSON when converting to YAML", () => {
    render(
      <PlatformProvider>
        <YamlJsonConverter />
      </PlatformProvider>,
    )
    fireEvent.click(screen.getByLabelText("JSON to YAML"))
    setInput("{")
    expect(screen.getByText("The JSON is not valid.")).toBeVisible()
  })

  it("clears back to defaults", () => {
    render(
      <PlatformProvider>
        <YamlJsonConverter />
      </PlatformProvider>,
    )
    setInput("name: Ada")
    fireEvent.click(screen.getByRole("button", { name: "Clear" }))
    expect(screen.getByLabelText(/YAML text|JSON text/)).toHaveValue("")
    expect(screen.queryByLabelText("Conversion result")).toBeNull()
  })
})
