import { expect, test } from "@playwright/test"

test("catalog search is usable", async ({ page }) => {
  await page.goto("/#/")
  await expect(
    page.getByRole("heading", { name: "Useful tools, ready when you are" }),
  ).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).last()).toBeVisible()
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll")

  await page.getByRole("searchbox", { name: "Search tools" }).fill("unit")
  await expect(page.getByRole("link", { name: "Unit Converter" })).toBeVisible()
  await expect(page.getByText("Timestamp Converter")).toHaveCount(0)
})

test("catalog does not overflow across foundation breakpoints", async ({ page }) => {
  for (const width of [320, 375, 600, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto("/#/")

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hasHorizontalOverflow, `horizontal overflow at ${width}px`).toBe(false)
    await expect(page.locator('nav[aria-label="Primary navigation"]:visible')).toHaveCount(1)
  }
})

test("an enabled tool opens and performs a conversion", async ({ page }) => {
  await page.goto("/#/tool/unit-converter")
  await expect(page.getByRole("heading", { name: "Unit Converter" })).toBeVisible()
  await page.getByLabel("From").fill("2")
  await expect(page.locator("#to-value")).toContainText("0.002")
})

test("markdown preview renders sanitized output", async ({ page }) => {
  await page.goto("/#/tool/markdown-preview")
  await expect(page.getByRole("heading", { name: "Markdown Preview" })).toBeVisible()

  await page.getByLabel("Markdown input").fill("# Hello\n\n**bold** body")
  await expect(
    page.getByRole("region", { name: "Rendered preview" }).getByRole("heading", { name: "Hello" }),
  ).toBeVisible()

  await page.getByLabel("Markdown input").fill("<script>alert(1)</script>\n\nplain text")
  await expect(page.getByRole("region", { name: "Rendered preview" })).toContainText("plain text")
  await expect(page.getByRole("region", { name: "Rendered preview" })).not.toContainText("alert")
})

test("theme selection persists", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})

test("opening a tool adds it to the recent tools destination", async ({ page }) => {
  await page.goto("/#/tool/unit-converter")
  await expect(page.getByRole("heading", { name: "Unit Converter" })).toBeVisible()

  await page.getByRole("link", { name: "Recent" }).click()
  await expect(page.getByRole("heading", { name: "Recent tools" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Unit Converter" })).toBeVisible()
  await expect(page.getByLabel("1 recent tool on this device")).toBeVisible()
})

test("regex tester evaluates in a worker and stops hostile patterns", async ({ page }) => {
  await page.goto("/#/tool/regex-tester")
  await expect(page.getByRole("heading", { name: "Regex Tester" })).toBeVisible()

  await page.getByLabel("Pattern").fill("\\d+")
  await page.getByLabel("Flags").fill("g")
  await page.getByLabel("Test string").fill("a1b22c333")
  await expect(page.getByRole("heading", { name: "Matches (3)" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Highlighted matches" })).toContainText("333")

  // A catastrophic pattern wedges its worker; the wall-clock budget must terminate it
  // instead of freezing the interface.
  await page.getByLabel("Pattern").fill("(a+)+$")
  await page.getByLabel("Test string").fill(`${"a".repeat(30)}!`)
  await expect(page.getByText(/stopped because it exceeded the time budget/)).toBeVisible({
    timeout: 10_000,
  })
})

test("qr generator renders a symbol with consistent output dimensions", async ({ page }) => {
  await page.goto("/#/tool/qr-generator")
  await expect(page.getByRole("heading", { name: "QR Generator" })).toBeVisible()

  await page.getByLabel("QR text").fill("https://example.com/qr")
  const description = page.getByText(/QR version \d+: \d+ by \d+ modules rendered at/)
  await expect(description).toBeVisible()

  // The canvas backing store must match the documented output size exactly, independent
  // of the CSS display size.
  const describedText = (await description.textContent()) ?? ""
  const describedPixels = Number(/rendered at (\d+) by/.exec(describedText)?.[1])
  const canvasWidth = await page.locator("canvas").evaluate((canvas) => {
    return (canvas as HTMLCanvasElement).width
  })
  expect(canvasWidth).toBe(describedPixels)
  expect(canvasWidth).toBeGreaterThan(200)

  // Oversized input shows the typed over-limit state instead of a symbol.
  await page.getByLabel("QR text").fill("a".repeat(4001))
  await expect(page.getByText(/QR text is limited to 4000 bytes/)).toBeVisible()
  await expect(page.getByText("Shorten the text to generate a QR code.")).toBeVisible()
})

test("json editor validates, formats, and inspects documents", async ({ page }) => {
  await page.goto("/#/tool/json-editor")
  await expect(page.getByRole("heading", { name: "JSON Editor" })).toBeVisible()

  await page.getByLabel("JSON input").fill('{"a":[1,2]}')
  await expect(page.getByText("Valid JSON")).toBeVisible()
  await page.getByRole("button", { name: "Format" }).click()
  await expect(page.getByLabel("JSON input")).toHaveValue('{\n  "a": [\n    1,\n    2\n  ]\n}')

  await page.getByLabel("JSON input").fill("{")
  await expect(page.getByText("Invalid JSON")).toBeVisible()
  await expect(page.getByRole("button", { name: "Format" })).toBeDisabled()

  // The inspector tree expands from a collapsed root.
  await page.getByLabel("JSON input").fill('{"user":{"name":"Ada"}}')
  await page.getByRole("tab", { name: "Tree" }).click()
  await page.getByRole("button", { name: "root" }).click()
  await expect(page.getByRole("button", { name: "user" })).toBeVisible()
  await page.getByRole("button", { name: "user" }).click()
  await expect(page.getByText(/string · "Ada"/)).toBeVisible()
})

test("notes scratchpad survives a reload and clears explicitly", async ({ page }) => {
  await page.goto("/#/tool/notes-scratchpad")
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible()

  await page.getByLabel("Scratchpad").fill("durable across reload")
  await expect(page.getByText(/Last saved/)).toBeVisible({ timeout: 10_000 })

  // The note is durable device data: it must survive a full reload.
  await page.reload()
  await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible()
  await expect(page.getByLabel("Scratchpad")).toHaveValue("durable across reload")

  // Clearing requires the explicit two-step confirmation.
  await page.getByRole("button", { name: "Clear note" }).click()
  await expect(page.getByLabel("Scratchpad")).toHaveValue("durable across reload")
  await page.getByRole("button", { name: "Tap again to confirm" }).click()
  await expect(page.getByLabel("Scratchpad")).toHaveValue("")
  await expect(page.getByText("Note cleared from this device.")).toBeVisible()
})
