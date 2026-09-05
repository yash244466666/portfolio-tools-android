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

test("theme selection persists", async ({ page }) => {
  await page.goto("/#/settings")
  await page.getByRole("button", { name: "Dark" }).click()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark")
})
