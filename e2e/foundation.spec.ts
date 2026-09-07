import { writeFileSync } from "node:fs"
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
  await expect(page.getByAltText("Compressed image preview, 1 by 1 pixels")).toBeVisible()
})

test("file hash checker computes real digests for a picked file", async ({ page }) => {
  await page.goto("/#/tool/file-hash-checker")
  await expect(page.getByRole("heading", { name: "File Hash Checker" })).toBeVisible()

  const pngPath = join(tmpdir(), "yash-tools-e2e-hash.png")
  writeFileSync(
    pngPath,
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    ),
  )

  const [fileChooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    page.getByRole("button", { name: "Choose file" }).click(),
  ])
  await fileChooser.setFiles(pngPath)

  // Independent oracle: the known SHA-256, SHA-1, and SHA-512 of this exact fixture.
  await expect(page.getByText("Computed 3 digests locally.")).toBeVisible({ timeout: 10_000 })
  await expect(
    page.getByText("c414cd0e204de974f73753c7e28d7638e7b3691bb8b1a2bab6b25bb7fed7ce77"),
  ).toBeVisible()
  await expect(page.getByText("b2bbe763c7e1828c750d53f78550709a6fea19be")).toBeVisible()
  await expect(
    page.getByText(
      "fcba48f85167b732f75c33a2232a87e393441948350f265737a483c8b4923fbc2d7dd4ea1ebf00bb774d8cb09c016610abfbc3d4597ebe2d16e81bb92cb3aa48",
    ),
  ).toBeVisible()
  await expect(page.getByText(/Legacy — not collision-secure/)).toBeVisible()
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

test("dns lookup resolves a mocked Cloudflare DoH answer", async ({ page }) => {
  // The provider response is mocked so the E2E run is deterministic; the request shape
  // (exact origin, name and type parameters) is asserted below as the contract.
  const requests: string[] = []
  await page.route("**/cloudflare-dns.com/dns-query**", (route) => {
    void requests.push(route.request().url())
    return route.fulfill({
      status: 200,
      contentType: "application/dns-json",
      body: JSON.stringify({
        Status: 0,
        Question: [{ name: "example.com", type: 1 }],
        Answer: [
          { name: "example.com", type: 1, TTL: 116, data: "172.66.147.243" },
          { name: "example.com", type: 1, TTL: 116, data: "104.20.23.154" },
        ],
      }),
    })
  })

  await page.goto("/#/tool/dns-lookup")
  await expect(page.getByRole("heading", { name: "DNS Lookup" })).toBeVisible()

  await page.getByLabel("Domain name").fill("example.com")
  await page.getByRole("button", { name: "Look up" }).click()

  await expect(page.getByText("2 records for example.com · answered by Cloudflare")).toBeVisible({
    timeout: 10_000,
  })
  await expect(page.getByText("172.66.147.243")).toBeVisible()
  await expect(page.getByText("104.20.23.154")).toBeVisible()
  await expect(page.getByText(/only the domain name and record type/)).toBeVisible()

  expect(requests.length).toBe(1)
  expect(requests[0]).toBe("https://cloudflare-dns.com/dns-query?name=example.com&type=A")
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

test("reverse text keeps emoji intact and switches modes", async ({ page }) => {
  await page.goto("/#/tool/reverse-text")
  await expect(page.getByRole("heading", { name: "Reverse Text" })).toBeVisible()
  await page.getByLabel("Text").fill("a👍b")
  await expect(page.getByText("👍a")).toBeVisible()
  await page.getByLabel("Words").check()
  await page.getByLabel("Text").fill("hello brave world")
  await expect(page.getByText("world brave hello")).toBeVisible()
})

test("number base converter converts across bases exactly", async ({ page }) => {
  await page.goto("/#/tool/number-base-converter")
  await expect(page.getByRole("heading", { name: "Number Base Converter" })).toBeVisible()
  await page.getByLabel("Decimal (radix 10)").fill("255")
  await expect(page.getByLabel("Hexadecimal (radix 16)")).toHaveValue("FF")
  await expect(page.getByLabel("Binary (radix 2)")).toHaveValue("11111111")
  await page.getByLabel("Hexadecimal (radix 16)").fill("10")
  await expect(page.getByLabel("Decimal (radix 10)")).toHaveValue("16")
})

test("base64 tool encodes and decodes UTF-8 text", async ({ page }) => {
  await page.goto("/#/tool/base64-tool")
  await expect(page.getByRole("heading", { name: "Base64 Encode/Decode" })).toBeVisible()
  await page.getByLabel("Input").fill("foo")
  await page.getByRole("button", { name: "Encode" }).click()
  await expect(page.getByText("Zm9v")).toBeVisible()
  await page.getByRole("button", { name: "Clear" }).click()
  await page.getByLabel("Input").fill("Zm9vYmFy")
  await page.getByRole("button", { name: "Decode" }).click()
  await expect(page.getByText("foobar")).toBeVisible()
  await page.getByLabel("Input").fill("not base64 at all !!!")
  await page.getByRole("button", { name: "Decode" }).click()
  await expect(page.getByText(/not valid Base64/)).toBeVisible()
})

test("url encoder encodes, decodes, and breaks down a URL", async ({ page }) => {
  await page.goto("/#/tool/url-encoder")
  await expect(page.getByRole("heading", { name: "URL Encoder/Decoder" })).toBeVisible()
  await page.getByLabel("Input").fill("https://example.com:8443/path?q=1#top")
  await page.getByRole("button", { name: "Encode" }).click()
  await expect(page.getByText("https%3A%2F%2Fexample.com")).toBeVisible()
  await expect(page.getByText("URL parts")).toBeVisible()
  await expect(page.getByText("8443", { exact: true })).toBeVisible()
})

test("text to slug generates a slug with options", async ({ page }) => {
  await page.goto("/#/tool/text-to-slug")
  await expect(page.getByRole("heading", { name: "Text to Slug" })).toBeVisible()
  await page.getByLabel("Text").fill("Hello, World!")
  await expect(page.getByText("hello-world").first()).toBeVisible()
  await page.getByText("_", { exact: true }).click()
  await expect(page.getByText("hello_world").first()).toBeVisible()
  await expect(page.getByText("Conversion steps")).toBeVisible()
})

test("sort lines orders lines across modes", async ({ page }) => {
  await page.goto("/#/tool/sort-lines")
  await expect(page.getByRole("heading", { name: "Sort Lines" })).toBeVisible()
  await page.getByRole("textbox", { name: "Lines" }).fill("banana\nApple\ncherry")
  await expect(page.locator("p.font-mono")).toHaveText("Apple\nbanana\ncherry")
  await page.getByText("Z → A").click()
  await expect(page.locator("p.font-mono")).toHaveText("cherry\nbanana\nApple")
})

test("add line numbers numbers lines with padding", async ({ page }) => {
  await page.goto("/#/tool/add-line-numbers")
  await expect(page.getByRole("heading", { name: "Add Line Numbers" })).toBeVisible()
  await page.getByLabel("Text").fill("a\nb\nc\nd\ne\nf\ng\nh\ni\nj")
  await expect(page.getByText(" 1. a")).toBeVisible()
  await expect(page.getByText("10. j")).toBeVisible()
})

test("trim whitespace trims and reports savings", async ({ page }) => {
  await page.goto("/#/tool/trim-whitespace")
  await expect(page.getByRole("heading", { name: "Trim Whitespace" })).toBeVisible()
  await page.getByLabel("Text").fill("  a  \n\tb\t")
  await expect(page.locator("p.font-mono")).toHaveText("a\nb")
  await expect(page.getByText(/Saved: 6 characters/)).toBeVisible()
})

test("remove duplicates dedupes lines case-sensitively", async ({ page }) => {
  await page.goto("/#/tool/remove-duplicates")
  await expect(page.getByRole("heading", { name: "Remove Duplicates" })).toBeVisible()
  await page.getByRole("textbox", { name: "Lines" }).fill("b\na\nb\na\nc")
  await expect(page.locator("p.font-mono")).toHaveText("b\na\nc")
  await expect(page.getByText(/5 in; 3 unique; 2 removed/)).toBeVisible()
  await page.getByRole("radio", { name: "Words" }).click()
  await page.getByRole("textbox", { name: "Words" }).fill("the cat THE cat")
  await page.getByRole("checkbox", { name: "Case sensitive" }).uncheck()
  await expect(page.locator("p.font-mono")).toHaveText("the cat")
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

test("gcd lcm calculator computes exact results with steps", async ({ page }) => {
  await page.goto("/#/tool/gcd-lcm-calculator")
  await expect(page.getByRole("heading", { name: "GCD/LCM Calculator" })).toBeVisible()
  await page.getByLabel("Numbers").fill("48, 18, 12")
  await expect(page.getByText("144")).toBeVisible()
  await expect(page.getByText(/gcd\(48, 18\)/)).toBeVisible()
})

test("roman numeral converter round-trips both directions", async ({ page }) => {
  await page.goto("/#/tool/roman-numeral-converter")
  await expect(page.getByRole("heading", { name: "Roman Numeral Converter" })).toBeVisible()
  await page.getByLabel("Arabic number (1–3999)").fill("1994")
  await expect(page.locator("p.font-mono.text-3xl")).toHaveText("MCMXCIV")
  await page.getByRole("radio", { name: "Roman to Arabic" }).click()
  await page.getByLabel("Roman numeral").fill("XLII")
  await expect(page.locator("p.font-mono.text-3xl")).toHaveText("42")
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

test("data sanitizer redacts selected PII types", async ({ page }) => {
  await page.goto("/#/tool/data-sanitizer")
  await expect(page.getByRole("heading", { name: "Data Sanitizer" })).toBeVisible()

  await page.getByLabel("Text with sensitive data").fill("jane@corp.dev from 192.168.0.5")
  await expect(page.getByText("[EMAIL REDACTED] from [IP REDACTED]")).toBeVisible()

  await page.getByRole("checkbox", { name: "IP Addresses" }).uncheck()
  await expect(page.getByText("[EMAIL REDACTED] from 192.168.0.5")).toBeVisible()
})

test("csp generator builds a policy from directives", async ({ page }) => {
  await page.goto("/#/tool/csp-generator")
  await expect(page.getByRole("heading", { name: "CSP Generator" })).toBeVisible()
  await expect(page.getByText("default-src 'self'")).toBeVisible()

  await page.getByRole("checkbox", { name: "Enable img-src" }).click()
  await page.getByRole("button", { name: "Add * to img-src" }).click()
  await expect(page.getByText("default-src 'self'; img-src *")).toBeVisible()
})

test("cors header builder emits and omits access headers", async ({ page }) => {
  await page.goto("/#/tool/cors-header-builder")
  await expect(page.getByRole("heading", { name: "CORS Header Builder" })).toBeVisible()
  await expect(page.locator("dl")).toContainText("Access-Control-Allow-Methods: GET, POST, OPTIONS")

  await page.getByText("POST", { exact: true }).click()
  await expect(page.locator("dl")).toContainText("Access-Control-Allow-Methods: GET, OPTIONS")

  await page.getByLabel("Max age (seconds)").fill("")
  await expect(page.locator("dl")).not.toContainText("Access-Control-Max-Age")
})

test("robots txt generator composes groups and rules", async ({ page }) => {
  await page.goto("/#/tool/robots-txt-generator")
  await expect(page.getByRole("heading", { name: "Robots.txt Generator" })).toBeVisible()

  const output = page.locator("pre")
  await expect(output).toContainText("User-agent: *")
  await expect(output).toContainText("Disallow: /admin/")
  await expect(output).toContainText("Sitemap: https://example.com/sitemap.xml")

  await page.getByLabel("Sitemap URL").fill("")
  await expect(output).not.toContainText("Sitemap:")
})

test("age calculator computes age, totals, and next birthday", async ({ page }) => {
  await page.goto("/#/tool/age-calculator")
  await expect(page.getByRole("heading", { name: "Age Calculator" })).toBeVisible()

  await page.getByLabel("Birth date").fill("1990-05-20")
  await expect(page.getByLabel("Computed age")).toContainText("years")
  await expect(page.getByText("Next birthday in")).toBeVisible()
  await expect(page.getByText(/Turning 37 years old on 2027-05-20/)).toBeVisible()
})

test("bitwise calculator computes 32-bit operations", async ({ page }) => {
  await page.goto("/#/tool/bitwise-calculator")
  await expect(page.getByRole("heading", { name: "Bitwise Calculator" })).toBeVisible()

  await expect(page.getByLabel("Decimal result", { exact: true })).toHaveText("15")
  await expect(page.getByLabel("Hexadecimal result", { exact: true })).toHaveText("0xF")

  await page.getByText("NOT", { exact: true }).click()
  await expect(page.getByLabel("Decimal result", { exact: true })).toHaveText("-256")
  await expect(page.getByLabel("Hexadecimal result", { exact: true })).toHaveText("0xFFFFFF00")
})

test("color blindness simulator approximates vision types", async ({ page }) => {
  await page.goto("/#/tool/color-blindness-simulator")
  await expect(page.getByRole("heading", { name: "Color Blindness Simulator" })).toBeVisible()

  await expect(page.getByText(/Original: RGB\(66, 135, 245\)/)).toBeVisible()
  await expect(page.getByText(/Protanopia: RGB\(96, 96, 218\)/)).toBeVisible()
  await expect(page.getByText(/not a medical diagnostic tool/)).toBeVisible()
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

test("http status codes lists and filters the reference", async ({ page }) => {
  await page.goto("/#/tool/http-status-codes")
  await expect(page.getByRole("heading", { name: "HTTP Status Codes" })).toBeVisible()

  await expect(page.getByText("Not Found", { exact: true })).toBeVisible()
  await page.getByLabel("Search status codes").fill("teapot")
  await expect(page.getByText("I'm a Teapot")).toBeVisible()
  await expect(page.getByText("Not Found", { exact: true })).toBeHidden()

  await page.getByLabel("Search status codes").fill("")
  await page.getByRole("group").getByText("5xx", { exact: true }).click()
  await expect(page.getByText("Service Unavailable")).toBeVisible()
  await expect(page.getByText("Not Found", { exact: true })).toBeHidden()
})

test("mime type lookup maps extensions and mime types", async ({ page }) => {
  await page.goto("/#/tool/mime-type-lookup")
  await expect(page.getByRole("heading", { name: "MIME Type Lookup" })).toBeVisible()

  await expect(page.getByText(".pdf → application/pdf")).toBeVisible()
  await page.getByLabel("Search extensions").fill("png")
  await expect(page.getByText(".png → image/png")).toBeVisible()
  await expect(page.getByText(".pdf → application/pdf")).toBeHidden()

  await page.getByText("MIME to Extension", { exact: true }).click()
  await page.getByLabel("Search MIME types").fill("image/jpeg")
  await expect(page.getByText(".jpg → image/jpeg")).toBeVisible()
})

test("meta tag generator emits and escapes meta tags", async ({ page }) => {
  await page.goto("/#/tool/meta-tag-generator")
  await expect(page.getByRole("heading", { name: "Meta Tag Generator" })).toBeVisible()

  await page.getByLabel("Title", { exact: true }).fill('My "Site"')
  await expect(page.getByText(/<title>My &quot;Site&quot;<\/title>/)).toBeVisible()

  await page.getByLabel("og:image").fill("https://example.com/image.png")
  await expect(page.getByText(/<!-- Open Graph \/ Facebook -->/)).toBeVisible()
})

test("unicode lookup searches and lists characters", async ({ page }) => {
  await page.goto("/#/tool/unicode-lookup")
  await expect(page.getByRole("heading", { name: "Unicode Lookup" })).toBeVisible()

  await page.getByLabel("Search characters").fill("infinity")
  await expect(page.getByRole("button", { name: "Copy Infinity (U+221E)" })).toBeVisible()

  await page.getByLabel("Search characters").fill("U+221E")
  await expect(page.getByRole("button", { name: "Copy Infinity (U+221E)" })).toBeVisible()
})

test("ascii table shows codes with base conversions", async ({ page }) => {
  await page.goto("/#/tool/ascii-table")
  await expect(page.getByRole("heading", { name: "ASCII Table" })).toBeVisible()

  await expect(page.getByRole("table")).toBeVisible()
  await expect(page.getByText("Uppercase A")).toBeVisible()
  await page.getByLabel("Search ASCII").fill("0x41")
  await expect(page.getByText("Uppercase A")).toBeVisible()
  await page.getByLabel("Search ASCII").fill("delete")
  await expect(page.getByText("Delete")).toBeVisible()
})

test("box shadow generator rebuilds its declaration", async ({ page }) => {
  await page.goto("/#/tool/box-shadow-generator")
  await expect(page.getByRole("heading", { name: "Box Shadow Generator" })).toBeVisible()

  await expect(
    page.getByText("box-shadow: 4px 4px 12px 0px rgba(99, 102, 241, 0.3);"),
  ).toBeVisible()
  await page.getByLabel("Blur", { exact: true }).fill("30")
  await expect(
    page.getByText("box-shadow: 4px 4px 30px 0px rgba(99, 102, 241, 0.3);"),
  ).toBeVisible()
  await page.getByLabel("Color", { exact: true }).fill("#000000")
  await expect(page.getByText("box-shadow: 4px 4px 30px 0px rgba(0, 0, 0, 0.3);")).toBeVisible()
})

test("border radius generator links corners and switches units", async ({ page }) => {
  await page.goto("/#/tool/border-radius-generator")
  await expect(page.getByRole("heading", { name: "Border Radius Generator" })).toBeVisible()

  await expect(page.getByText("border-radius: 16px;")).toBeVisible()
  await page.getByLabel("Link corners").check()
  await page.getByLabel("Top left", { exact: true }).fill("24")
  await expect(page.getByText("border-radius: 24px;")).toBeVisible()
  await page.getByRole("group").getByText("rem", { exact: true }).click()
  await expect(page.getByText("border-radius: 10rem;")).toBeVisible()
})

test("text shadow generator stacks layers", async ({ page }) => {
  await page.goto("/#/tool/text-shadow-generator")
  await expect(page.getByRole("heading", { name: "Text Shadow Generator" })).toBeVisible()

  await expect(page.getByText("text-shadow: 2px 2px 4px #6366f1;")).toBeVisible()
  await page.getByRole("button", { name: "Add shadow layer" }).click()
  await expect(page.getByText(/, 2px 2px 4px #6366f1;/)).toBeVisible()
  await page.getByRole("button", { name: "Remove layer 2" }).click()
  await expect(page.getByText("text-shadow: 2px 2px 4px #6366f1;")).toBeVisible()
})

test("triangle generator switches direction and size", async ({ page }) => {
  await page.goto("/#/tool/triangle-generator")
  await expect(page.getByRole("heading", { name: "CSS Triangle Generator" })).toBeVisible()

  await expect(page.getByText(/border-bottom: 100px solid #6366f1;/)).toBeVisible()
  await page.getByRole("group").getByText("Right", { exact: true }).click()
  await expect(page.getByText(/border-left: 100px solid #6366f1;/)).toBeVisible()
  await page.getByLabel("Width").fill("60")
  await expect(page.getByText(/border-left: 60px solid #6366f1;/)).toBeVisible()
})

test("gradient border generator emits the snippet", async ({ page }) => {
  await page.goto("/#/tool/gradient-border-generator")
  await expect(page.getByRole("heading", { name: "Gradient Border Generator" })).toBeVisible()

  await expect(page.getByText(/linear-gradient\(135deg, #6366f1, #06b6d4\)/)).toBeVisible()
  await page.getByLabel("Border width").fill("10")
  await expect(page.getByText(/padding: 10px;/)).toBeVisible()
  await page.getByLabel("Start color", { exact: true }).fill("#ff0000")
  await expect(page.getByText(/linear-gradient\(135deg, #ff0000, #06b6d4\)/)).toBeVisible()
})
