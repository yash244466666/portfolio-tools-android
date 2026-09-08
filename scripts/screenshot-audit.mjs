// Screenshot audit harness for UI polish batches: captures the shell screens
// plus 10 representative tools across the supported breakpoints, both
// orientations, and both themes. Serve a build with `pnpm preview` and run
// `node scripts/screenshot-audit.mjs`; override BASE/OUT via the environment
// to capture a before/after pair from two builds.
import { chromium } from "@playwright/test"
import { mkdirSync } from "node:fs"

const BASE = process.env.AUDIT_BASE ?? "http://127.0.0.1:4173"
const OUT = process.env.AUDIT_OUT ?? "/tmp/yash-ui-audit"

const screens = [
  ["catalog", "#/"],
  ["favorites-empty", "#/favorites"],
  ["recent-empty", "#/recent"],
  ["settings", "#/settings"],
  ["unit-converter", "#/tool/unit-converter"],
  ["hash-generator", "#/tool/hash-generator"],
  ["json-editor", "#/tool/json-editor"],
  ["markdown-preview", "#/tool/markdown-preview"],
  ["qr-generator", "#/tool/qr-generator"],
  ["chart-generator", "#/tool/chart-generator"],
  ["pomodoro-timer", "#/tool/pomodoro-timer"],
  ["currency-converter", "#/tool/currency-converter"],
  ["color-picker", "#/tool/color-picker"],
  ["dice-roller", "#/tool/dice-roller"],
]

const viewports = [
  [320, 568],
  [568, 320],
  [375, 667],
  [667, 375],
  [600, 960],
  [960, 600],
  [768, 1024],
  [1024, 768],
  [1280, 800],
]

const themes = ["light", "dark"]

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
for (const theme of themes) {
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } })
  const page = await context.newPage()
  await page.addInitScript(
    (t) => localStorage.setItem("yash-tools:v1:theme", JSON.stringify(t)),
    theme,
  )
  await page.goto(BASE + "/#/")
  await page.waitForSelector(".tool-grid")

  for (const [name, hash] of screens) {
    await page.goto(BASE + "/" + hash)
    if (name === "catalog" || name.endsWith("-empty") || name === "settings") {
      await page.waitForSelector(".screen-title")
    } else {
      await page.waitForSelector(".tool-heading, .screen-title", { timeout: 10000 })
      // give lazy tool chunks a beat
      await page.waitForTimeout(400)
    }
    for (const [w, h] of viewports) {
      await page.setViewportSize({ width: w, height: h })
      await page.waitForTimeout(120)
      await page.screenshot({
        path: `${OUT}/${name}-${w}x${h}-${theme}.png`,
        fullPage: false, // viewport-only so detail stays legible when re-read
      })
      // also capture the first tool-grid page for catalog screens
      if (name === "catalog") {
        await page.evaluate(() => {
          const top = document.querySelector(".tool-grid")?.getBoundingClientRect().top ?? 0
          window.scrollTo({ top: window.scrollY + top - 60, behavior: "instant" })
        })
        await page.waitForTimeout(120)
        await page.screenshot({ path: `${OUT}/${name}-grid-${w}x${h}-${theme}.png` })
        await page.evaluate(() => window.scrollTo(0, 0))
      }
    }
  }
  await context.close()
}
await browser.close()
console.log("done")
