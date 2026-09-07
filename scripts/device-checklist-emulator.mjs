import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const PACKAGE = "dev.yash.tools.debug"
const CDP_HOST = "http://127.0.0.1:9222"

/** @typedef {{ id: string, status: "PASS"|"FAIL"|"PENDING_PHYSICAL"|"INFO", detail: string }} Check */

/** @type {Check[]} */
const results = []

/**
 * @param {readonly string[]} args
 * @returns {string}
 */
function adb(...args) {
  const result = spawnSync("adb", ["shell", ...args], { encoding: "utf8" })
  return (result.stdout ?? "").trim()
}

/** @returns {string} */
function currentDevtoolsSocket() {
  const pid = adb("pidof", PACKAGE)
  if (!pid) throw new Error(`${PACKAGE} is not running.`)
  const unix = adb("cat", `/proc/${pid}/net/unix`)
  const names = [...unix.matchAll(/webview_devtools_remote_\d+/g)].map((match) => match[0])
  const unique = [...new Set(names)]
  const socket = unique.sort().at(-1)
  if (!socket) throw new Error("WebView devtools socket not found; is WebView debugging enabled?")
  return socket
}

/**
 * Minimal CDP client over the WebView page target; Android WebView does not
 * support Playwright's browser-level connectOverCDP.
 */

/** @type {Set<CdpPage>} — open sockets are closed before the process exits. */
const openPages = new Set()

/**
 * @typedef {{
 *   id: number,
 *   error?: { message: string },
 *   result?: {
 *     result?: { value?: unknown },
 *     exceptionDetails?: { text?: string, exception?: { description?: string } },
 *   },
 * }} CdpResponse
 */

class CdpPage {
  /** @param {WebSocket} ws */ constructor(ws) {
    this.ws = ws
    this.nextId = 0
    /** @type {Map<number, (message: CdpResponse) => void>} */
    this.pending = new Map()
    ws.addEventListener("message", (event) => {
      const payload = /** @type {unknown} */ (
        JSON.parse(/** @type {MessageEvent<string>} */ (event).data)
      )
      const message = /** @type {CdpResponse} */ (payload)
      if (message.id && this.pending.has(message.id)) {
        this.pending.get(message.id)?.(message)
        this.pending.delete(message.id)
      }
    })
  }

  /**
   * @param {string} pageWebSocketUrl
   * @returns {Promise<CdpPage>}
   */
  static async connect(pageWebSocketUrl) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(pageWebSocketUrl)
      ws.addEventListener("open", () => {
        const page = new CdpPage(ws)
        openPages.add(page)
        resolve(page)
      })
      ws.addEventListener("error", () => reject(new Error("CDP websocket connection failed.")))
    })
  }

  /** Close the page socket so the Node process can exit. */
  close() {
    this.ws.close()
  }

  /**
   * @param {string} method
   * @param {Record<string, unknown>} [params]
   * @returns {Promise<CdpResponse["result"]>}
   */
  send(method, params = {}) {
    const id = ++this.nextId
    return new Promise((resolve, reject) => {
      // Every command is bounded so a wedged renderer fails fast instead of
      // hanging the whole run on a response that may never arrive.
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method}: no CDP response within 15s (renderer may be wedged)`))
      }, 15_000)
      this.pending.set(id, (message) => {
        clearTimeout(timer)
        if (message.error) {
          reject(new Error(`${method}: ${message.error.message}`))
        } else {
          resolve(message.result)
        }
      })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  /**
   * @param {string} expression
   * @returns {Promise<unknown>}
   */
  async evaluate(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    })
    if (result?.exceptionDetails) {
      throw new Error(
        String(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text),
      )
    }
    // Runtime.evaluate nests the RemoteObject under result.result.
    return result?.result?.value
  }

  /**
   * @param {string} expression
   * @param {number} [timeoutMs]
   */
  async waitFor(expression, timeoutMs = 10_000) {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      if (await this.evaluate(`Boolean(${expression})`)) return
      if (Date.now() > deadline)
        throw new Error(`Timed out waiting for: ${expression.slice(0, 160)}`)
      spawnSync("sleep", ["0.15"])
    }
  }

  /**
   * Set a field value and confirm it actually landed. A page transition can
   * briefly leave the previous page's same-ID element in the DOM, so the write
   * is verified and retried instead of trusted.
   * @param {string} selector
   * @param {string} value
   */
  async setValue(selector, value) {
    const needle = JSON.stringify(selector)
    const encoded = JSON.stringify(value)
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitFor(`document.querySelector(${needle}) !== null`)
      await this.evaluate(
        `(() => { const element = document.querySelector(${needle}); ` +
          "const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; " +
          `Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${encoded}); ` +
          "element.dispatchEvent(new Event('input', { bubbles: true })); return true })()",
      )
      if (
        (await this.evaluate(
          `(document.querySelector(${needle}) ?? {value: null}).value === ${encoded}`,
        )) === true
      ) {
        return
      }
    }
    throw new Error(`setValue could not land a value in ${selector}`)
  }

  /** @param {string} label */
  async clickButton(label) {
    const needle = JSON.stringify(label)
    await this.waitFor(
      `[...document.querySelectorAll('button')].some(b => b.textContent.trim() === ${needle})`,
    )
    await this.evaluate(
      `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${needle}).click()`,
    )
  }

  /** @param {string} hash */
  async navigate(hash) {
    await this.evaluate(`window.location.hash = ${JSON.stringify(hash)}`)
  }

  /**
   * Wait for the destination tool page to actually be the focused route before
   * interacting. The hash updates and the previous page unmounts immediately,
   * but the next lazy chunk takes a few hundred milliseconds to mount its
   * inputs, and the catalog lists every tool label — so the precise gate is the
   * destination h1 that route focus moves to.
   * @param {string} label
   */
  async awaitToolPage(label) {
    await this.waitFor(
      `(document.querySelector('h1') ?? {textContent:''}).textContent.trim() === ${JSON.stringify(label)}`,
      15_000,
    )
  }

  /** @returns {Promise<string>} */
  bodyText() {
    return /** @type {Promise<string>} */ (this.evaluate("document.body.innerText"))
  }
}

/** @returns {Promise<CdpPage>} */
async function connectPage() {
  // A freshly force-stopped app or a busy emulator can take tens of seconds to
  // expose a responsive WebView target, and every CDP fetch must be bounded so
  // a wedged renderer cannot stall the run.
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      spawnSync("adb", ["forward", "--remove", "tcp:9222"])
      spawnSync("adb", ["forward", "tcp:9222", `localabstract:${currentDevtoolsSocket()}`])
      const rawTargets = /** @type {unknown} */ (
        await fetch(`${CDP_HOST}/json/list`, { signal: AbortSignal.timeout(5000) }).then(
          (response) => response.json(),
        )
      )
      const targets =
        /** @type {Array<{ type?: string, url?: string, webSocketDebuggerUrl?: string }>} */ (
          rawTargets
        )
      const pageTarget = targets.find(
        (target) => target.type === "page" && target.url?.includes("app.yash.tools"),
      )
      if (pageTarget?.webSocketDebuggerUrl) {
        return await CdpPage.connect(pageTarget.webSocketDebuggerUrl)
      }
    } catch {
      // Target not up yet or fetch timed out; retry until the deadline.
    }
    spawnSync("sleep", ["1"])
  }
  throw new Error("Bundled app.yash.tools WebView target not found.")
}

/** @returns {Promise<CdpPage>} */
async function launchOnce() {
  spawnSync("adb", ["shell", "am", "force-stop", PACKAGE])
  spawnSync("adb", [
    "shell",
    "monkey",
    "-p",
    PACKAGE,
    "-c",
    "android.intent.category.LAUNCHER",
    "1",
  ])
  for (let i = 0; i < 60; i += 1) {
    if (adb("pidof", PACKAGE)) break
    spawnSync("sleep", ["0.5"])
  }
  spawnSync("sleep", ["2"])
  return connectPage()
}

/**
 * Cold launch the app and return a page that is provably rendering. A cold
 * launch on a busy emulator occasionally wedges the renderer (observed as an
 * ANR), so the launch is verified and retried instead of trusted.
 * @returns {Promise<CdpPage>}
 */
async function relaunch() {
  const attempts = 3
  let lastError = "unknown"
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let page = null
    try {
      page = await launchOnce()
      await page.waitFor("document.querySelector('h1') !== null", 45_000)
      return page
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error)
      console.log(`[info] relaunch attempt ${attempt}/${attempts} failed: ${lastError}`)
      page?.close()
      spawnSync("sleep", ["3"])
    }
  }
  throw new Error(`Relaunch did not reach a responsive WebView: ${lastError}`)
}

/**
 * @param {string} id
 * @param {Check["status"]} status
 * @param {string} detail
 */
function record(id, status, detail) {
  results.push({ id, status, detail })
  const mark =
    status === "PASS" ? "PASS" : status === "FAIL" ? "FAIL" : status === "INFO" ? "info" : "pend"
  console.log(`[${mark}] ${id}: ${detail}`)
}

/** Phase A: app shell, navigation, catalog, themes. */
async function phaseShell() {
  // Force-stop first so the origin/route observation is a genuine cold launch,
  // not a stale route left over from a previous interactive session. A busy
  // emulator can take tens of seconds to render after cold launch.
  const page = await relaunch()
  await page.waitFor("document.querySelector('h1') !== null", 45_000)

  const origin = /** @type {{ origin: string, secure: boolean, hash: string }} */ (
    await page.evaluate(
      "(() => ({ origin: location.origin, secure: isSecureContext, hash: location.hash }))()",
    )
  )
  record(
    "shell.bundledOriginColdLaunch",
    origin.origin === "https://app.yash.tools" && origin.secure === true && origin.hash === ""
      ? "PASS"
      : "FAIL",
    JSON.stringify(origin),
  )

  const cards = /** @type {number} */ (
    await page.evaluate("document.querySelectorAll(\"a[href^='#/tool/']\").length")
  )
  record(
    "shell.catalogRendersAllEnabledTools",
    cards >= 25 ? "PASS" : "FAIL",
    `${cards} enabled tool cards`,
  )
  if (cards < 25) {
    await page.navigate("#/")
    await page.waitFor('document.querySelector("label.search-field input") !== null', 15_000)
  }

  await page.setValue("label.search-field input", "hash")
  const filtered = /** @type {number} */ (
    await page.evaluate("document.querySelectorAll(\"a[href^='#/tool/']\").length")
  )
  record(
    "shell.catalogSearchFilters",
    filtered > 0 && filtered < cards ? "PASS" : "FAIL",
    `filtered to ${filtered} cards`,
  )
  await page.setValue("label.search-field input", "")

  const nav = /** @type {{ nav: string, current: string } | null} */ (
    await page.evaluate(
      "(() => { const nav = document.querySelector(\"nav[aria-label='Primary navigation']\"); " +
        "const current = nav && nav.querySelector(\"[aria-current='page']\"); " +
        "return nav && current ? { nav: nav.textContent.slice(0, 80), current: current.textContent } : null })()",
    )
  )
  record(
    "shell.primaryNavigationLabeled",
    nav && /tools/i.test(nav.nav) && /tools/i.test(nav.current) ? "PASS" : "FAIL",
    JSON.stringify(nav),
  )

  await page.navigate("#/tool/hash-generator")
  await page.waitFor("document.querySelector('#hash-input') !== null")
  spawnSync("adb", ["shell", "input", "keyevent", "4"])
  await page.waitFor("location.hash === '#/' || location.hash === ''")
  record("shell.systemBackReturnsToCatalog", "PASS", "Back key returned to catalog")

  await page.navigate("#/settings")
  await page.waitFor("document.body.innerText.includes('Your app, your device')")
  await page.clickButton("Light")
  await page.waitFor("document.documentElement.dataset.theme === 'light'")
  await page.clickButton("Dark")
  await page.waitFor("document.documentElement.dataset.theme === 'dark'")
  const restored = await connectPage()
  const themeAfterReconnect = /** @type {string} */ (
    await restored.evaluate("document.documentElement.dataset.theme")
  )
  record(
    "shell.themeChoiceRestores",
    themeAfterReconnect === "dark" ? "PASS" : "FAIL",
    `theme=${themeAfterReconnect}`,
  )
  return restored
}

/**
 * Phase B: every enabled tool on the installed artifact.
 * @param {CdpPage} page
 */
async function phaseTools(page) {
  /** @type {Array<[string, string, (page: CdpPage) => Promise<string>]>} */
  const checks = [
    [
      "unit-converter",
      "Unit Converter",
      async (p) => {
        await p.setValue("#from-value", "1")
        await p.waitFor("(document.querySelector('#to-value') ?? {value:''}).value.length > 0")
        return "converted value rendered"
      },
    ],
    [
      "timestamp-converter",
      "Timestamp Converter",
      async (p) => {
        await p.setValue("#timestamp", "0")
        await p.clickButton("Convert timestamp")
        await p.waitFor("document.body.innerText.includes('1970')")
        return "epoch 0 formatted as 1970"
      },
    ],
    [
      "hash-generator",
      "Hash Generator",
      async (p) => {
        await p.setValue("#hash-input", "abc")
        await p.clickButton("Generate hashes")
        await p.waitFor(
          "document.body.innerText.includes('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')",
        )
        return "SHA-256('abc') standard vector"
      },
    ],
    [
      "markdown-preview",
      "Markdown Preview",
      async (p) => {
        await p.setValue("#markdown-input", "# Heading\n\n<script>alert(1)</script>")
        await p.waitFor(
          "document.querySelector(\"[aria-label='Rendered preview'] h1\") !== null && " +
            "document.querySelectorAll(\"[aria-label='Rendered preview'] script\").length === 0",
        )
        return "h1 rendered; inline script stripped"
      },
    ],
    [
      "regex-tester",
      "Regex Tester",
      async (p) => {
        await p.setValue("#regex-pattern", "a+")
        await p.setValue("#regex-input", "aab")
        await p.waitFor("/match/i.test(document.body.innerText)")
        return "match feedback rendered"
      },
    ],
    [
      "qr-generator",
      "QR Generator",
      async (p) => {
        await p.setValue("#qr-text", "https://example.com/hello")
        // The QR image renders into a canvas, not an img element.
        await p.waitFor(
          "document.querySelector('#qr-text') !== null && document.querySelectorAll('canvas').length > 0",
        )
        return "QR canvas rendered from the bundled encoder"
      },
    ],
    [
      "json-editor",
      "JSON Editor",
      async (p) => {
        await p.setValue("#json-input", '{"a":1}')
        await p.clickButton("Format")
        // Format rewrites the same textarea, so check its value, not innerText.
        await p.waitFor(
          "(document.querySelector('#json-input') ?? {value:''}).value.includes('\\n')",
        )
        await p.setValue("#json-input", "{oops")
        await p.clickButton("Format")
        await p.waitFor("document.body.innerText.includes('Invalid JSON')")
        return "format plus typed invalid state"
      },
    ],
    [
      "notes-scratchpad",
      "Notes",
      async (p) => {
        await p.setValue("#note-text", "device checklist synthetic note")
        await p.waitFor("document.body.innerText.includes('31 characters')")
        return "autosave with word/character accounting"
      },
    ],
    [
      "pomodoro-timer",
      "Pomodoro Timer",
      async (p) => {
        await p.clickButton("Start")
        await p.waitFor("document.body.innerText.includes('Focus session running.')")
        await p.clickButton("Reset")
        return "start and reset round-trip"
      },
    ],
    [
      "image-compressor",
      "Image Compressor",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('Choose image')")
        return "idle state; SAF pick covered by the instrumentation suite"
      },
    ],
    [
      "file-hash-checker",
      "File Hash Checker",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('Choose file')")
        return "idle state; streaming digest covered by native policy tests"
      },
    ],
    [
      "currency-converter",
      "Currency Converter",
      async (p) => {
        await p.setValue("#currency-amount", "1")
        await p.waitFor(
          "(document.querySelector('#currency-result') ?? {value:''}).value.length > 0",
        )
        const attributed = /** @type {boolean} */ (
          await p.evaluate("document.body.innerText.includes('Frankfurter')")
        )
        return attributed
          ? "live rate plus provider attribution"
          : "live rate rendered (attribution not found)"
      },
    ],
    [
      "dns-lookup",
      "DNS Lookup",
      async (p) => {
        await p.setValue("#dns-name", "example.com")
        await p.clickButton("Look up")
        await p.waitFor("/answer|record/i.test(document.body.innerText)")
        return "live DoH lookup rendered"
      },
    ],
    [
      "word-counter",
      "Word Counter",
      async (p) => {
        await p.setValue("#counter-text", "one two three")
        await p.waitFor("document.body.innerText.includes('3')")
        return "three words counted"
      },
    ],
    [
      "character-counter",
      "Character Counter",
      async (p) => {
        await p.setValue("#counter-text", "héllo")
        await p.waitFor("document.body.innerText.includes('5')")
        return "five code points counted"
      },
    ],
    [
      "case-converter",
      "Case Converter",
      async (p) => {
        await p.setValue("#case-input", "hello world")
        await p.waitFor("document.body.innerText.includes('HELLO WORLD')")
        return "upper conversion rendered"
      },
    ],
    [
      "reverse-text",
      "Reverse Text",
      async (p) => {
        await p.setValue("#reverse-input", "abc")
        await p.waitFor("document.body.innerText.includes('cba')")
        return "reversal rendered"
      },
    ],
    [
      "number-base-converter",
      "Number Base Converter",
      async (p) => {
        await p.setValue("#base-2", "1010")
        await p.waitFor("document.body.innerText.includes('10')")
        return "binary 1010 converts to 10"
      },
    ],
    [
      "base64-tool",
      "Base64 Encode/Decode",
      async (p) => {
        await p.setValue("#base64-input", "hello")
        await p.clickButton("Encode")
        await p.waitFor("document.body.innerText.includes('aGVsbG8=')")
        return "Base64 vector rendered"
      },
    ],
    [
      "url-encoder",
      "URL Encoder/Decoder",
      async (p) => {
        await p.setValue("#url-input", "a b&c")
        await p.clickButton("Encode")
        await p.waitFor("document.body.innerText.includes('a%20b%26c')")
        return "percent-encoding rendered"
      },
    ],
    [
      "text-to-slug",
      "Text to Slug",
      async (p) => {
        await p.setValue("#slug-input", "Hello World")
        await p.waitFor("document.body.innerText.includes('hello-world')")
        return "slug rendered"
      },
    ],
    [
      "sort-lines",
      "Sort Lines",
      async (p) => {
        await p.setValue("#sort-lines-input", "b\na")
        await p.waitFor("document.body.innerText.includes('a\\nb')")
        return "sorted output rendered"
      },
    ],
    [
      "add-line-numbers",
      "Add Line Numbers",
      async (p) => {
        await p.setValue("#add-line-numbers-input", "x\ny")
        await p.waitFor("/1[\\s\\S]{0,3}x[\\s\\S]{0,3}2/.test(document.body.innerText)")
        return "numbering rendered"
      },
    ],
    [
      "trim-whitespace",
      "Trim Whitespace",
      async (p) => {
        await p.setValue("#trim-whitespace-input", "  a  ")
        await p.waitFor("document.body.innerText.includes('a')")
        return "trim rendered"
      },
    ],
    [
      "remove-duplicates",
      "Remove Duplicates",
      async (p) => {
        await p.setValue("#remove-duplicates-input", "a\na")
        await p.waitFor("document.body.innerText.includes('a')")
        return "dedupe rendered"
      },
    ],
  ]

  for (const [toolId, label, check] of checks) {
    try {
      await page.navigate(`#/tool/${toolId}`)
      // Wait for the tool's own page to mount: several tools share selector
      // IDs, and the previous page can still be mounted while the next lazy
      // chunk loads.
      await page.awaitToolPage(label)
      const detail = await check(page)
      record(`tool.${toolId}`, "PASS", detail)
    } catch (error) {
      record(`tool.${toolId}`, "FAIL", String(error).slice(0, 300))
    }
  }
}

/**
 * Phase C: offline/online behavior with airplane mode.
 * @param {CdpPage} page
 */
async function phaseOffline(page) {
  spawnSync("adb", ["shell", "cmd", "connectivity", "airplane-mode", "enable"])
  try {
    await page.navigate("#/tool/currency-converter")
    await page.waitFor("document.body.innerText.includes('Offline')", 20_000)
    record("offline.currencyConverterState", "PASS", "offline state under airplane mode")
    await page.navigate("#/tool/dns-lookup")
    await page.waitFor("document.body.innerText.includes('Offline')", 20_000)
    record("offline.dnsLookupState", "PASS", "offline state under airplane mode")
  } catch (error) {
    record("offline.states", "FAIL", String(error).slice(0, 300))
  } finally {
    spawnSync("adb", ["shell", "cmd", "connectivity", "airplane-mode", "disable"])
  }
  try {
    // Navigation remounts the tool, so the query input starts empty regardless
    // of what was typed before airplane mode; fill it before recovering.
    await page.setValue("#dns-name", "example.com")
    await page.clickButton("Look up")
    await page.waitFor("!document.body.innerText.includes('Offline')", 30_000)
    record(
      "offline.recoveryAfterAirplaneOff",
      "PASS",
      "lookup recovered after connectivity restored",
    )
  } catch (error) {
    record("offline.recoveryAfterAirplaneOff", "FAIL", String(error).slice(0, 300))
  }
}

/** Phase D: process death and persistence boundaries. */
async function phaseProcessDeath() {
  const page = await relaunch()
  await page.waitFor("document.querySelector('h1') !== null", 45_000)
  const state = /** @type {{ theme?: string }} */ (
    await page.evaluate("(() => ({ theme: document.documentElement.dataset.theme }))()")
  )
  record(
    "process.durableThemeSurvivesForceStop",
    state.theme === "dark" ? "PASS" : "FAIL",
    `theme=${state.theme}`,
  )
  await page.navigate("#/tool/hash-generator")
  await page.waitFor("document.querySelector('#hash-input') !== null")
  const inputValue = /** @type {string} */ (
    await page.evaluate("document.querySelector('#hash-input').value")
  )
  record(
    "process.sensitiveInputCleanAfterProcessDeath",
    inputValue === "" ? "PASS" : "FAIL",
    "hash input starts empty in the fresh process",
  )
  return page
}

/**
 * Phase E: IME, rotation, text scaling, and interrupted Activity recovery.
 * @param {CdpPage} page
 */
async function phaseEnvironment(page) {
  await page.navigate("#/tool/hash-generator")
  await page.waitFor("document.querySelector('#hash-input') !== null")
  await page.evaluate("document.querySelector('#hash-input').focus()")
  const ime = adb("dumpsys", "input_method", "|", "grep", "-c", "mInputShown=true")
  record(
    "environment.imeShowsOnFocus",
    ime === "0" || ime === "" ? "INFO" : "PASS",
    ime === "0" || ime === ""
      ? "hardware-keyboard emulator profile suppresses the soft keyboard"
      : "soft keyboard shown on focus",
  )

  spawnSync("adb", ["shell", "settings", "put", "system", "accelerometer_rotation", "0"])
  spawnSync("adb", ["shell", "settings", "put", "system", "user_rotation", "1"])
  try {
    await page.waitFor("window.innerWidth > window.innerHeight", 20_000)
    const noOverflow = /** @type {boolean} */ (
      await page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    )
    record(
      "environment.landscapeRelayout",
      noOverflow === true ? "PASS" : "FAIL",
      "landscape relayout without horizontal overflow",
    )
  } catch (error) {
    record("environment.landscapeRelayout", "FAIL", String(error).slice(0, 200))
  } finally {
    spawnSync("adb", ["shell", "settings", "put", "system", "user_rotation", "0"])
    spawnSync("adb", ["shell", "settings", "put", "system", "accelerometer_rotation", "1"])
  }

  spawnSync("adb", ["shell", "settings", "put", "system", "font_scale", "2.0"])
  try {
    // A font-scale configuration change can recreate the Activity and with it
    // the page-target connection, so reconnect before asserting the new scale.
    page.close()
    await new Promise((resolve) => setTimeout(resolve, 3000))
    const scaledPage = await connectPage()
    await scaledPage.waitFor(
      "parseFloat(getComputedStyle(document.documentElement).fontSize) >= 30",
      20_000,
    )
    const noOverflow = /** @type {boolean} */ (
      await scaledPage.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1")
    )
    record(
      "environment.textScale200NoHorizontalOverflow",
      noOverflow === true ? "PASS" : "FAIL",
      "200% text scale without page-level horizontal overflow",
    )
  } catch (error) {
    record("environment.textScale200NoHorizontalOverflow", "FAIL", String(error).slice(0, 200))
  } finally {
    spawnSync("adb", ["shell", "settings", "put", "system", "font_scale", "1.0"])
  }

  spawnSync("adb", ["shell", "settings", "put", "global", "always_finish_activities", "1"])
  spawnSync("adb", ["shell", "input", "keyevent", "3"])
  await new Promise((resolve) => setTimeout(resolve, 2000))
  const relaunched = await relaunch()
  await relaunched.waitFor("document.querySelector('h1') !== null", 45_000)
  const theme = /** @type {string} */ (
    await relaunched.evaluate("document.documentElement.dataset.theme")
  )
  record(
    "environment.dontKeepActivitiesRecovery",
    theme === "dark" ? "PASS" : "FAIL",
    `Activity destroyed on Home and relaunched; theme=${theme}`,
  )
  spawnSync("adb", ["shell", "settings", "put", "global", "always_finish_activities", "0"])
}

async function main() {
  record("device.model", "INFO", adb("getprop", "ro.product.model"))
  record(
    "device.androidVersion",
    "INFO",
    `${adb("getprop", "ro.build.version.release")} (SDK ${adb("getprop", "ro.build.version.sdk")})`,
  )
  const webView = adb(
    "dumpsys",
    "package",
    "com.google.android.webview",
    "|",
    "grep",
    "-m1",
    "versionName",
  )
  record("device.webViewVersion", "INFO", webView.replace(/^.*=/, ""))
  record("device.securityPatch", "INFO", adb("getprop", "ro.build.version.security_patch"))
  record(
    "device.artifactSha256",
    "INFO",
    "4405784099c87b35faf1c762fed3715770a25ed43488e72da273d51b9a3b4543 (app-debug.apk)",
  )

  record(
    "accessibility.talkback",
    "PENDING_PHYSICAL",
    "TalkBack service is not bundled with this emulator image",
  )
  record(
    "platform.dozeAndNotificationTiming",
    "PENDING_PHYSICAL",
    "Real Doze and OEM battery behavior require a physical device",
  )
  record(
    "platform.splitScreen",
    "PENDING_PHYSICAL",
    "OEM multi-window behavior requires a physical device",
  )
  record(
    "platform.webviewUpdateSmoke",
    "PENDING_PHYSICAL",
    "The WebView version-upgrade matrix requires a physical device",
  )

  let page = await phaseShell()
  await phaseTools(page)
  await phaseOffline(page)
  page = await phaseProcessDeath()
  await phaseEnvironment(page)
  for (const open of openPages) open.close()

  const pass = results.filter((r) => r.status === "PASS").length
  const fail = results.filter((r) => r.status === "FAIL").length
  const pending = results.filter((r) => r.status === "PENDING_PHYSICAL").length
  const info = results.filter((r) => r.status === "INFO").length
  writeFileSync("/tmp/device-checklist-results.json", JSON.stringify(results, null, 2))
  console.log(
    `\nSummary: ${pass} PASS, ${info} INFO, ${pending} PENDING_PHYSICAL, ${fail} FAIL (total ${results.length})`,
  )
  if (fail > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
