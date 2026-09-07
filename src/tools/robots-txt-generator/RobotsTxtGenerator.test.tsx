import { fireEvent, render, screen } from "@testing-library/react"
import { PlatformProvider } from "@/platform/platform-context"
import RobotsTxtGenerator from "@/tools/robots-txt-generator/RobotsTxtGenerator"

describe("Robots.txt Generator interactions", () => {
  it("renders the default group with rules and sitemap", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )
    const pre = screen.getByText(/User-agent: \*/)
    // textContent keeps the raw newlines the normalizer would collapse.
    expect(pre.textContent).toBe(
      "User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://example.com/sitemap.xml",
    )
  })

  it("adds a second user-agent group", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Add user-agent group" }))
    expect(screen.getByText("Group: unnamed")).toBeVisible()
    expect(screen.getAllByLabelText(/User-agent/).length).toBe(2)
  })

  it("removes an added group", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Add user-agent group" }))
    fireEvent.click(screen.getAllByRole("button", { name: "Remove this group" })[1]!)
    expect(screen.queryByText("Group: unnamed")).toBeNull()
  })

  it("adds and removes a disallow rule", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )

    const addButtons = screen.getAllByRole("button", { name: "Add disallow rule" })
    fireEvent.click(addButtons[0]!)
    fireEvent.change(screen.getByLabelText(/Disallow path 1-disallow-2/), {
      target: { value: "/private/" },
    })
    expect(screen.getByText(/Disallow: \/private\//)).toBeVisible()

    fireEvent.click(screen.getByRole("button", { name: "Remove disallow rule /private/" }))
    expect(screen.queryByText(/Disallow: \/private\//)).toBeNull()
  })

  it("renames the user-agent token in the output", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getAllByLabelText("User-agent")[0]!, {
      target: { value: "Googlebot" },
    })
    expect(screen.getByText(/User-agent: Googlebot/)).toBeVisible()
    expect(screen.getByText("Group: Googlebot")).toBeVisible()
  })

  it("validates the sitemap URL", () => {
    render(
      <PlatformProvider>
        <RobotsTxtGenerator />
      </PlatformProvider>,
    )

    fireEvent.change(screen.getByLabelText("Sitemap URL"), {
      target: { value: "http://example.com/sitemap.xml" },
    })
    expect(screen.getByRole("alert")).toHaveTextContent(/https:\/\//)

    fireEvent.change(screen.getByLabelText("Sitemap URL"), { target: { value: "" } })
    expect(screen.queryByText(/Sitemap:/)).toBeNull()
  })
})
