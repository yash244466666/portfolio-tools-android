import { readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

test("catalog search is usable", async ({ page }) => {
  await page.goto("/#/")
  await expect(
    page.getByRole("heading", { name: "Useful tools, ready when you are" }),
  ).toBeVisible()
  await expect(page.getByRole("navigation", { name: "Primary navigation" }).last()).toBeVisible()
  await expect(page.locator("body")).not.toHaveCSS("overflow-x", "scroll")

  await page.getByRole("searchbox", { name: "Search tools" }).fill("unit")
  await expect(page.getByRole("link", { name: "Unit Converter", exact: true })).toBeVisible()
  await expect(page.getByText("Dice Roller")).toHaveCount(0)

  // The clear affordance empties the query and restores the full listing.
  const clearButton = page.getByRole("button", { name: "Clear search" })
  await expect(clearButton).toBeVisible()
  await clearButton.click()
  await expect(page.getByText("Dice Roller")).toBeVisible()
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

test("shell interactive controls meet the 48 dp touch floor", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/#/")

  const assertFloor = async (selector: string) => {
    const boxes = await page.locator(selector).evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect()
        return { width: rect.width, height: rect.height }
      }),
    )
    expect(boxes.length, `${selector} should exist`).toBeGreaterThan(0)
    for (const box of boxes) {
      expect(
        Math.min(box.width, box.height),
        `${selector} target ${JSON.stringify(box)} smaller than 48 px`,
      ).toBeGreaterThanOrEqual(48)
    }
  }

  await assertFloor(".filter-chip")
  await assertFloor(".bottom-link")
  await assertFloor(".search-field")
  await assertFloor(".tool-card .icon-button")

  await page.goto("/#/settings")
  await assertFloor(".segmented-control .segment")

  await page.goto("/#/tool/unit-converter")
  await assertFloor(".back-link")

  // .text-link is a standalone empty-state CTA or settings action, never inline
  // prose, so it carries the same floor centrally. It previously rendered at
  // roughly 24 px tall on all five call sites.
  await page.goto("/#/favorites")
  await assertFloor(".text-link")

  await page.goto("/#/tool/not-a-real-tool")
  await assertFloor(".text-link")

  await page.goto("/#/settings")
  await assertFloor(".text-link")

  // The checkbox/radio full-row pattern: a compact control inside a min-h-12 label
  // row, where the row (not the box) is the tap target. ADR 0023 cut the CSP Generator
  // that this assertion originally used, so it now runs against a retained tool that
  // uses the same shared row pattern.
  await page.goto("/#/tool/fuel-trip-cost-calculator")
  const optionRows = 'label:has(input[type="checkbox"])'
  await page.locator(optionRows).first().waitFor()
  await assertFloor(optionRows)
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

test("opening a tool adds it to the recent tools destination", async ({ page }) => {
  await page.goto("/#/tool/unit-converter")
  await expect(page.getByRole("heading", { name: "Unit Converter" })).toBeVisible()

  await page.getByRole("link", { name: "Recent" }).click()
  await expect(page.getByRole("heading", { name: "Recent tools" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Unit Converter" })).toBeVisible()
  await expect(page.getByLabel("1 recent tool on this device")).toBeVisible()
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

test("pomodoro timer runs, pauses, and resets from the device clock", async ({ page }) => {
  await page.goto("/#/tool/pomodoro-timer")
  await expect(page.getByRole("heading", { name: "Pomodoro Timer" })).toBeVisible()
  await expect(page.getByRole("timer")).toHaveText("25:00")

  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.getByText("Focus session running.")).toBeVisible()
  // Remaining time derives from the wall clock, not from counted ticks.
  await expect(page.getByRole("timer")).not.toHaveText("25:00", { timeout: 5000 })

  await page.getByRole("button", { name: "Pause" }).click()
  const frozen = await page.getByRole("timer").textContent()
  await page.waitForTimeout(1500)
  await expect(page.getByRole("timer")).toHaveText(frozen ?? "")
  await expect(page.getByText("Timer paused.")).toBeVisible()

  await page.getByRole("button", { name: "Resume" }).click()
  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByRole("timer")).toHaveText("25:00")
  await expect(page.getByText("Timer reset.")).toBeVisible()

  // Enabling alerts requests permission first and never crashes when unavailable.
  await page.getByRole("button", { name: "Alert me at phase end" }).click()
  await expect(page.getByRole("status")).toContainText(/notification/i)
  await expect(page.getByRole("button", { name: /Alerts on|Alert me/ })).toBeVisible()
})

test("image compressor compresses a picked image end to end", async ({ page }) => {
  await page.goto("/#/tool/image-compressor")
  await expect(page.getByRole("heading", { name: "Image Compressor" })).toBeVisible()

  // A synthetic 1x1 PNG exercises the real picker, decode, canvas, and PNG re-encode.
  const pngPath = join(tmpdir(), "yash-tools-e2e-image.png")
  writeFileSync(
    pngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  )

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Choose image" }).click(),
  ])
  await fileChooser.setFiles(pngPath)
  await expect(page.getByText(/Selected:/)).toBeVisible()

  await page.getByRole("button", { name: "Compress image" }).click()
  await expect(page.getByText(/1 by 1 pixels ·/)).toBeVisible({ timeout: 10_000 })
  await expect(
    page.getByAltText(/Compressed image preview, 1 by 1 pixels — compressed/),
  ).toBeVisible()
})

test("currency converter fetches mocked Frankfurter rates and converts", async ({ page }) => {
  // The provider response is mocked so the E2E run is deterministic; the request shape
  // (exact origin, base parameter) is asserted below as the packaged-origin contract.
  const requests: string[] = []
  await page.route("**/api.frankfurter.dev/v2/rates**", (route) => {
    void requests.push(route.request().url())
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        { date: "2026-09-07", base: "USD", quote: "EUR", rate: 0.86044 },
        { date: "2026-09-07", base: "USD", quote: "BDT", rate: 122.8 },
      ]),
    })
  })

  await page.goto("/#/tool/currency-converter")
  await expect(page.getByRole("heading", { name: "Currency Converter" })).toBeVisible()

  await expect(page.locator("#currency-result")).toHaveText("0.8604 EUR", { timeout: 10_000 })
  await expect(page.getByText(/1 USD = 0.8604 EUR · provider data date 2026-09-07/)).toBeVisible()
  await expect(page.getByText(/Fresh rates fetched/)).toBeVisible()
  await expect(page.getByText(/Rates come from Frankfurter/)).toBeVisible()
  await expect(page.getByText(/only the selected base currency code/)).toBeVisible()

  expect(requests.length).toBe(1)
  expect(requests[0]).toBe("https://api.frankfurter.dev/v2/rates?base=USD")

  await page.getByLabel("Amount").fill("2")
  await expect(page.locator("#currency-result")).toHaveText("1.7209 EUR")
})

test("word counter counts words, sentences, and paragraphs", async ({ page }) => {
  await page.goto("/#/tool/word-counter")
  await expect(page.getByRole("heading", { name: "Word Counter" })).toBeVisible()
  await page.getByLabel("Text").fill("Hello world. Second sentence!\n\nNew paragraph?")
  await expect(page.getByText("Words").locator("xpath=preceding-sibling::p")).toHaveText("6")
  await expect(page.getByText("Paragraphs").locator("xpath=preceding-sibling::p")).toHaveText("2")
})

test("case converter shows all eight conversions", async ({ page }) => {
  await page.goto("/#/tool/case-converter")
  await expect(page.getByRole("heading", { name: "Case Converter" })).toBeVisible()
  await page.getByLabel("Text").fill("hello world")
  const conversions = page.getByRole("list").locator(":scope > li")
  await expect(conversions).toHaveCount(8)
  const conversionText = conversions.locator("p.font-mono")
  await expect(conversionText.filter({ hasText: /^HELLO WORLD$/ })).toBeVisible()
  await expect(conversionText.filter({ hasText: /^helloWorld$/ })).toBeVisible()
  await expect(conversionText.filter({ hasText: /^hello_world$/ })).toBeVisible()
})

test("character counter counts code points", async ({ page }) => {
  await page.goto("/#/tool/character-counter")
  await expect(page.getByRole("heading", { name: "Character Counter" })).toBeVisible()
  await page.getByLabel("Text").fill("a👍b c")
  await expect(page.getByText("Characters").locator("xpath=preceding-sibling::p")).toHaveText("5")
})

test("percentage calculator computes percent of and percent change", async ({ page }) => {
  await page.goto("/#/tool/percentage-calculator")
  await expect(page.getByRole("heading", { name: "Percentage Calculator" })).toBeVisible()
  await page.getByLabel("Percentage (X %)").fill("25")
  await page.getByLabel("Of value (Y)").fill("200")
  await expect(page.locator("p.font-mono.text-3xl")).toHaveText("50")
  await page.getByRole("radio", { name: "% Change" }).click()
  await page.getByLabel("New value").fill("12")
  await page.getByLabel("Old value").fill("8")
  await expect(page.locator("p.font-mono.text-3xl")).toHaveText("50%")
})

test("tip calculator computes tip and splits the bill", async ({ page }) => {
  await page.goto("/#/tool/tip-calculator")
  await expect(page.getByRole("heading", { name: "Tip Calculator" })).toBeVisible()
  await page.getByLabel("Bill amount").fill("100")
  await page.getByRole("button", { name: "20%" }).click()
  await expect(page.getByText("20.00", { exact: true })).toBeVisible()
  await expect(page.getByText("120.00", { exact: true })).toBeVisible()
  await page.getByLabel("Split between").fill("3")
  await expect(page.getByText("40.00", { exact: true })).toBeVisible()
})

test("password strength checker reports bands and requirements", async ({ page }) => {
  await page.goto("/#/tool/password-strength-checker")
  await expect(page.getByRole("heading", { name: "Password Strength Checker" })).toBeVisible()

  await page.getByLabel("Password to analyze").fill("abcdefgh")
  await expect(page.getByText("Weak", { exact: true })).toBeVisible()
  await expect(page.getByText("Minutes to hours")).toBeVisible()
  await expect(page.getByText("38 bits", { exact: true })).toBeVisible()

  await page.getByLabel("Password to analyze").fill("Correct-Horse-Battery-42")
  await expect(page.getByText("Very Strong", { exact: true })).toBeVisible()
  await expect(page.getByText("Centuries+")).toBeVisible()
})

test("age calculator computes age, totals, and next birthday", async ({ page }) => {
  await page.goto("/#/tool/age-calculator")
  await expect(page.getByRole("heading", { name: "Age Calculator" })).toBeVisible()

  await page.getByLabel("Birth date").fill("1990-05-20")
  await expect(page.getByLabel("Computed age")).toContainText("years")
  await expect(page.getByText("Next birthday in")).toBeVisible()
  await expect(page.getByText(/Turning 37 years old on 2027-05-20/)).toBeVisible()
})

test("scientific calculator evaluates precedence and functions", async ({ page }) => {
  await page.goto("/#/tool/calculator")
  await expect(page.getByRole("heading", { name: "Scientific Calculator" })).toBeVisible()

  for (const name of ["2", "Multiply", "3", "Add", "4", "Equals"]) {
    await page.getByRole("button", { name, exact: true }).click()
  }
  await expect(page.getByRole("status")).toContainText("Display 10")

  await page.getByRole("button", { name: "Clear", exact: true }).click()
  await page.getByRole("button", { name: "Scientific" }).click()
  await page.getByRole("button", { name: "9", exact: true }).click()
  await page.getByRole("button", { name: "Square root" }).click()
  await expect(page.getByRole("status")).toContainText("Display 3")
})

test("password generator uses the selected sets and secure random", async ({ page }) => {
  await page.goto("/#/tool/password-generator")
  await expect(page.getByRole("heading", { name: "Password Generator" })).toBeVisible()

  await page.getByLabel("Length").fill("32")
  await page.getByRole("button", { name: "Generate" }).click()
  const password = await page.getByLabel("Generated password").textContent()
  expect(password).toHaveLength(32)
  expect(password).toMatch(/^[A-Za-z0-9!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]+$/)
  await expect(page.getByText(/Strength: /)).toBeVisible()

  // Regression: upstream silently fell back to lowercase when nothing was selected.
  await page.getByLabel("Lowercase letters").uncheck()
  await page.getByLabel("Uppercase letters").uncheck()
  await page.getByLabel("Numbers").uncheck()
  await page.getByLabel("Symbols").uncheck()
  await expect(page.getByText(/Select at least one character set/)).toBeVisible()
  await expect(page.getByRole("button", { name: "Generate" })).toBeDisabled()
})

test("color picker converts channels and checks contrast", async ({ page }) => {
  await page.goto("/#/tool/color-picker")
  await expect(page.getByRole("heading", { name: "Color Picker" })).toBeVisible()

  // A three-digit hex entry expands into canonical channels.
  await page.getByLabel("Hex", { exact: true }).fill("#0af")
  await expect(page.getByRole("spinbutton", { name: "R" })).toHaveValue("0")
  await expect(page.getByRole("spinbutton", { name: "G" })).toHaveValue("170")
  await expect(page.getByRole("spinbutton", { name: "B" })).toHaveValue("255")

  await page.getByLabel("Compare against").fill("#000000")
  await expect(page.getByRole("status", { name: "Contrast verdict" })).toContainText("on #000000")

  // Adopting a harmony swatch makes it the current color.
  await page.getByLabel("Hex", { exact: true }).fill("#6366f1")
  await page.getByRole("button", { name: /Use complementary / }).click()
  await expect(page.getByLabel("Hex", { exact: true })).not.toHaveValue("#6366f1")
})

test("stopwatch counts, laps, and resets on wall-clock anchors", async ({ page }) => {
  await page.goto("/#/tool/stopwatch")
  await expect(page.getByRole("heading", { name: "Stopwatch" })).toBeVisible()

  await expect(page.getByRole("timer")).toHaveText("00:00.00")
  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.getByRole("timer")).not.toHaveText("00:00.00")
  await page.getByRole("button", { name: "Lap", exact: true }).click()
  await page.getByRole("button", { name: "Lap", exact: true }).click()
  await expect(page.getByRole("table")).toContainText("(best lap)")
  await expect(page.getByRole("table")).toContainText("(worst lap)")
  await page.getByRole("button", { name: "Stop" }).click()
  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByRole("timer")).toHaveText("00:00.00")
  await expect(page.getByRole("table")).toHaveCount(0)
})

test("countdown timer runs from presets and rejects zero durations", async ({ page }) => {
  await page.goto("/#/tool/countdown-timer")
  await expect(page.getByRole("heading", { name: "Countdown Timer" })).toBeVisible()

  await expect(page.getByRole("timer", { name: "Remaining time" })).toHaveText("00:00:00")
  await page.getByRole("button", { name: "1 min" }).click()
  await page.getByRole("button", { name: "Start" }).click()
  await expect(page.getByRole("timer", { name: "Remaining time" })).toHaveText("00:01:00")
  await page.getByRole("button", { name: "Pause" }).click()
  await expect(page.getByText("Paused", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByRole("timer", { name: "Remaining time" })).toHaveText("00:00:00")

  await page.getByLabel("Minutes").fill("0")
  await expect(page.getByRole("alert")).toContainText("at least one second")
  await expect(page.getByRole("button", { name: "Start" })).toBeDisabled()
})

test("iCalendar and vCard generators escape text and validate links", async ({ page }) => {
  await page.goto("/#/tool/ical-generator")
  await expect(page.getByRole("heading", { name: "iCalendar Generator" })).toBeVisible()

  await page.getByLabel("Event title").fill("Sync, part 2")
  await page.getByLabel("Start date").fill("2026-09-10")
  await page.getByLabel("End date").fill("2026-09-10")
  await page.getByRole("button", { name: "Generate .ics" }).click()
  await expect(page.locator("pre")).toContainText("SUMMARY:Sync\\, part 2")

  await page.goto("/#/tool/vcard-generator")
  await expect(page.getByRole("heading", { name: "vCard Generator" })).toBeVisible()

  await page.getByLabel("First name").fill("Grace")
  await page.getByLabel("Last name").fill("Hopper; Admiral")
  await page.getByLabel("Website (optional)").fill("http://example.com")
  await page.getByRole("button", { name: "Generate vCard" }).click()
  await expect(page.getByRole("alert")).toContainText("Enter an https website URL.")

  await page.getByLabel("Website (optional)").fill("https://example.com")
  await page.getByRole("button", { name: "Generate vCard" }).click()
  await expect(page.locator("pre")).toContainText("N:Hopper\\; Admiral;Grace;;;")
  await expect(page.locator("pre")).toContainText("URL:https://example.com")
})

test("pdf converter extracts real text from a generated two-page PDF", async ({ page }) => {
  // Independent oracle: the PDF fixture is built by pdf-lib itself, so the
  // extracted strings exercise the real bundled pdf.js worker end to end.
  const { PDFDocument, StandardFonts } = await import("pdf-lib")
  await page.goto("/#/tool/pdf-converter")
  await expect(page.getByRole("heading", { name: "PDF Converter" })).toBeVisible()

  const pdfPath = join(tmpdir(), "yash-tools-e2e-text.pdf")
  const fixture = await PDFDocument.create()
  const font = await fixture.embedFont(StandardFonts.Helvetica)
  for (const line of ["Alpha page", "Beta page"]) {
    const fixturePage = fixture.addPage([400, 300])
    fixturePage.drawText(line, { x: 40, y: 150, size: 24, font })
  }
  writeFileSync(pdfPath, await fixture.save())

  await page.getByRole("button", { name: "PDF to Text" }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Choose PDF" }).click(),
  ])
  await chooser.setFiles(pdfPath)
  await expect(page.getByText(/Selected .* PDF\./)).toBeVisible()
  await page.getByRole("button", { name: "Extract text" }).click()

  const editor = page.getByLabel("Extracted text")
  await expect(editor).toHaveValue(/Alpha page/, { timeout: 15_000 })
  await expect(editor).toHaveValue(/Beta page/)
  await expect(page.getByText("Extracted text from 2 pages.")).toBeVisible()
})

test("pdf converter saves a real PDF built from picked images", async ({ page }) => {
  await page.goto("/#/tool/pdf-converter")
  await expect(page.getByRole("heading", { name: "PDF Converter" })).toBeVisible()

  const pngPath = join(tmpdir(), "yash-tools-e2e-pdf-image.png")
  writeFileSync(
    pngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  )

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Choose images" }).click(),
  ])
  await chooser.setFiles(pngPath)
  await expect(page.getByText("Selected 1 image.")).toBeVisible()

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Convert to PDF" }).click(),
  ])
  expect(download.suggestedFilename()).toBe("yash-tools-e2e-pdf-image.pdf")
  const savedPath = join(tmpdir(), "yash-tools-e2e-output.pdf")
  await download.saveAs(savedPath)
  const saved = readFileSync(savedPath)
  // The real pdf-lib output begins with the PDF magic and closes with EOF.
  expect(saved.subarray(0, 5).toString()).toBe("%PDF-")
  await expect(page.getByText("Saved yash-tools-e2e-pdf-image.pdf with 1 page.")).toBeVisible()
})

test("audio recorder discloses offline-only capture and the unsupported fallback honestly", async ({
  page,
}) => {
  await page.goto("/#/tool/audio-recorder")
  await expect(page.getByRole("heading", { name: "Audio Recorder" })).toBeVisible()

  await expect(page.getByRole("status")).toContainText("offline-only")
  await expect(page.getByText("10 minutes or 32 MB")).toBeVisible()
  await expect(page.getByText(/never written to storage unless you export/i)).toBeVisible()

  // The browser harness has no microphone grant, so starting capture must
  // surface a distinct, recoverable state instead of a generic failure.
  await page.getByRole("button", { name: "Start recording" }).click()
  await expect(page.getByRole("alert")).toBeVisible()
  await expect(page.getByRole("button", { name: "Start recording" })).toBeEnabled()
})

test("discount and tax calculator shows every exact-cent step and rejects junk money", async ({
  page,
}) => {
  await page.goto("/#/tool/discount-tax-calculator")
  await expect(page.getByRole("heading", { name: "Discount and Tax Calculator" })).toBeVisible()
  await expect(page.getByRole("status")).toContainText("Enter the price")

  await page.getByLabel("Original price").fill("100.00")
  await page.getByLabel("Discount percent").fill("25")
  await page.getByLabel("Tax percent").fill("8")
  await expect(page.getByRole("status")).toContainText(
    "You save 25.00; the subtotal after discount is 75.00, tax adds 6.00, and the total is 81.00.",
  )
  await expect(page.getByRole("table")).toContainText("Total to pay")
  await expect(page.getByRole("table")).toContainText("81.00")

  // Junk money fails closed with a visible recovery alert.
  await page.getByLabel("Original price").fill("1.999")
  await expect(page.getByRole("alert")).toContainText("at most 2 decimals")

  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByRole("status")).toContainText("Enter the price")
})

test("time zone converter crosses zones and surfaces daylight-saving edges honestly", async ({
  page,
}) => {
  await page.goto("/#/tool/time-zone-converter")
  await expect(page.getByRole("heading", { name: "Time Zone Converter" })).toBeVisible()
  await expect(page.getByRole("status")).toContainText("Enter a date and time")

  await page.getByLabel("Date").fill("2026-01-15")
  await page.getByLabel("Time").fill("12:00")
  await expect(page.getByRole("status")).toContainText(
    "2026-01-15 12:00 in America/New_York is 2026-01-15 23:00 in Asia/Dhaka",
  )

  // A spring-forward gap is surfaced as its own state, never silently folded.
  await page.getByLabel("Date").fill("2026-03-08")
  await page.getByLabel("Time").fill("02:30")
  await expect(page.getByRole("alert")).toContainText("does not exist")

  await page.getByRole("button", { name: "Clear" }).click()
  await expect(page.getByRole("status")).toContainText("Enter a date and time")
})

test("loan EMI calculator computes the known vector and discloses its indicative nature", async ({
  page,
}) => {
  await page.goto("/#/tool/loan-emi-calculator")
  await expect(page.getByRole("heading", { name: "Loan EMI Calculator" })).toBeVisible()
  await expect(page.getByRole("status")).toContainText("Enter the principal")

  await page.getByLabel("Principal amount").fill("100000")
  await page.getByLabel(/annual interest rate/i).fill("12")
  await page.getByLabel(/tenure/i).fill("12")
  await expect(page.getByRole("status")).toContainText("The EMI is 8884.88 per month for 12 months")
  await expect(page.getByRole("table")).toContainText("100000.00")
  await expect(page.getByRole("note")).toContainText("Indicative only")

  await page.getByRole("button", { name: "Reset" }).click()
  await expect(page.getByRole("status")).toContainText("Enter the principal")
})

test("BMI calculator shows the WHO band and the estimate-only disclaimer", async ({ page }) => {
  await page.goto("/#/tool/bmi-calculator")
  await expect(page.getByRole("heading", { name: "BMI Calculator" })).toBeVisible()
  await page.locator("#bmi-weight").fill("70")
  await page.locator("#bmi-height-cm").fill("175")
  await expect(page.getByText(/BMI 22\.9 —/)).toBeVisible()
  await expect(page.getByText(/normal band/)).toBeVisible()
  await expect(page.getByText(/not medical advice/)).toBeVisible()
})

test("unit price comparer ranks mixed units by base-unit cost", async ({ page }) => {
  await page.goto("/#/tool/unit-price-comparer")
  await expect(page.getByRole("heading", { name: "Unit Price Comparer" })).toBeVisible()
  await page.locator("#unit-price-label-1").fill("Bottle")
  await page.locator("#unit-price-unit-1").selectOption("l")
  await page.locator("#unit-price-price-1").fill("4.50")
  await page.locator("#unit-price-quantity-1").fill("1.5")
  await page.locator("#unit-price-unit-2").selectOption("ml")
  await page.locator("#unit-price-price-2").fill("2.00")
  await page.locator("#unit-price-quantity-2").fill("500")
  await expect(page.getByText("Bottle at 0.0030 per ml")).toBeVisible()
})

test("date difference calculator reports exclusive spans and business days", async ({ page }) => {
  await page.goto("/#/tool/date-difference-calculator")
  await expect(page.getByRole("heading", { name: "Date Difference Calculator" })).toBeVisible()
  await page.locator("#date-diff-start").fill("2026-09-07")
  await page.locator("#date-diff-end").fill("2026-09-11")
  await expect(page.getByText(/with 4 business days/)).toBeVisible()
  await expect(page.getByText("Business days (Mon-Fri)")).toBeVisible()
})

test("reduced motion keeps tool results immediate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" })
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(
    true,
  )
  await page.goto("/#/tool/random-picker")
  await page.getByRole("button", { name: "Coin flip" }).click()
  await page.getByRole("button", { name: "Flip coin" }).click()
  await expect(page.getByRole("button", { name: "Flip coin" })).toBeEnabled()
  await expect(page.locator("#random-picker-result")).toHaveText(/^(Heads|Tails)$/)
})

test("sensor tools expose honest live or unsupported states", async ({ page }) => {
  await page.goto("/#/tool/level")
  await expect(page.getByRole("heading", { name: "Level & Angle" })).toBeVisible()
  await expect(page.getByTestId("level-state")).toBeVisible()
  await expect(page.getByText(/accelerometer measures gravity/)).toBeVisible()

  await page.goto("/#/tool/compass")
  await expect(page.getByRole("heading", { name: "Compass" })).toBeVisible()
  await expect(page.getByText(/does not use\s+location/)).toBeVisible()

  await page.goto("/#/tool/barometer")
  await expect(page.getByRole("heading", { name: "Barometer & Altitude" })).toBeVisible()
  await expect(page.getByText(/standard-atmosphere estimate/)).toBeVisible()

  await page.goto("/#/tool/light-meter")
  await expect(page.getByRole("heading", { name: "Light Meter" })).toBeVisible()
  await expect(page.getByText(/ambient-light readings are approximate/i)).toBeVisible()

  await page.goto("/#/tool/vibration-meter")
  await expect(page.getByRole("heading", { name: "Vibration Meter" })).toBeVisible()
  await expect(page.getByText(/Linear acceleration excludes gravity/)).toBeVisible()
})

test("recipe scaler scales quantities and leaves unmeasured lines", async ({ page }) => {
  await page.goto("/#/tool/recipe-scaler")
  await expect(page.getByRole("heading", { name: "Recipe Scaler" })).toBeVisible()
  await page.getByLabel("Desired servings").fill("8")
  await page.getByLabel("Ingredients").fill("2 cups flour\n1 1/2 tsp salt\nsalt to taste")
  const list = page.getByRole("list", { name: "Scaled list" })
  await expect(list.getByText("4 cups flour")).toBeVisible()
  await expect(list.getByText("3 tsp salt")).toBeVisible()
  await expect(list.getByText("salt to taste")).toBeVisible()
  await expect(page.getByText("×2", { exact: true })).toBeVisible()
})

test("date calculator adds months with month-end clamping", async ({ page }) => {
  await page.goto("/#/tool/date-calculator")
  await expect(page.getByRole("heading", { name: "Date Calculator" })).toBeVisible()
  await page.locator("#date-calculator-start").fill("2026-01-31")
  await page.locator("#date-calculator-amount").fill("1")
  await page.getByLabel("Unit").selectOption("months")
  await expect(page.locator("#date-calculator-result")).toHaveText("2026-02-28")
  await expect(page.getByText("Saturday", { exact: true })).toBeVisible()
})

test("random picker selects a list item and an inclusive number", async ({ page }) => {
  await page.goto("/#/tool/random-picker")
  await expect(page.getByRole("heading", { name: "Random Picker" })).toBeVisible()
  await page.getByLabel("Items").fill("Pizza\nSushi\nTacos")
  await page.getByRole("button", { name: "Pick an item" }).click()
  await expect(page.locator("#random-picker-result")).toHaveText(/^(Pizza|Sushi|Tacos)$/)
  await page.getByRole("button", { name: "Number" }).click()
  await page.getByLabel("Minimum").fill("5")
  await page.getByLabel("Maximum").fill("5")
  await page.getByRole("button", { name: "Pick a number" }).click()
  await expect(page.locator("#random-picker-result")).toHaveText("5")
})

test("dice roller rolls from secure bytes and repeats the last roll", async ({ page }) => {
  await page.goto("/#/tool/dice-roller")
  await expect(page.getByRole("heading", { name: "Dice Roller" })).toBeVisible()
  await page.locator("#dice-notation").fill("1d6 + 0")
  await page.getByRole("button", { name: "Roll" }).click()
  const result = page.getByRole("status")
  await expect(result).toContainText(/^Total [1-6] from 1d6 \+ 0\.$/)
  await expect(page.getByRole("table")).toBeVisible()
  await page.getByRole("button", { name: "Repeat last roll" }).click()
  await expect(result).toContainText(/^Total [1-6] from 1d6 \+ 0\.$/)
})

test("fuel and trip cost calculator handles round trip and passenger split", async ({ page }) => {
  await page.goto("/#/tool/fuel-trip-cost-calculator")
  await expect(page.getByRole("heading", { name: "Fuel and Trip Cost Calculator" })).toBeVisible()
  await page.locator("#fuel-distance").fill("150")
  await page.locator("#fuel-efficiency").fill("6.5")
  await page.locator("#fuel-price").fill("1.85")
  await page.locator("#fuel-passengers").fill("3")
  await expect(page.getByText("23.077 l of fuel, costing 42.69 total")).toBeVisible()
  await page.getByLabel("Round trip (double the distance)").check()
  await expect(page.getByText("46.154 l of fuel, costing 85.38 total")).toBeVisible()
})
