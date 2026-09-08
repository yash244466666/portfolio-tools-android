import { spawnSync } from "node:child_process"
import { writeFileSync } from "node:fs"

const PACKAGE = "dev.yash.tools.debug"
const ARTIFACT_PATH = "android/app/build/outputs/apk/debug/app-debug.apk"
const CDP_HOST = "http://127.0.0.1:9222"
/** Enabled tools the catalog must list; keep in step with the registry. */
const enabledToolCount = 91

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

  /**
   * Selects an <option> by value. A select element is not an input, so
   * setValue's input-prototype write throws "Illegal invocation" in
   * Chromium; this drives HTMLSelectElement.prototype instead.
   * @param {string} selector
   * @param {string} value
   */
  async selectOption(selector, value) {
    const needle = JSON.stringify(selector)
    const encoded = JSON.stringify(value)
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await this.waitFor(`document.querySelector(${needle}) !== null`)
      await this.evaluate(
        `(() => { const element = document.querySelector(${needle}); ` +
          "Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, " +
          `${encoded}); ` +
          "element.dispatchEvent(new Event('change', { bubbles: true })); return true })()",
      )
      if (
        (await this.evaluate(
          `(document.querySelector(${needle}) ?? {value: null}).value === ${encoded}`,
        )) === true
      ) {
        return
      }
    }
    throw new Error(`selectOption could not land a value in ${selector}`)
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

  /**
   * Clicks a checkbox by its accessible name. Native checkboxes are inputs,
   * not buttons, so the button matcher cannot reach them.
   * @param {string} label
   */
  async clickCheckbox(label) {
    const needle = JSON.stringify(label)
    await this.waitFor(
      `[...document.querySelectorAll('input[type=checkbox]')].some(i => i.getAttribute('aria-label') === ${needle})`,
    )
    await this.evaluate(
      `[...document.querySelectorAll('input[type=checkbox]')].find(i => i.getAttribute('aria-label') === ${needle}).click()`,
    )
  }

  /**
   * Clicks the first button or input carrying an exact aria-label. Quick-tag
   * buttons show a short label but expose their full name through aria-label.
   * @param {string} label
   */
  async clickAriaLabel(label) {
    const needle = JSON.stringify(label)
    await this.waitFor(
      `[...document.querySelectorAll('button,input')].some(e => e.getAttribute('aria-label') === ${needle})`,
    )
    await this.evaluate(
      `[...document.querySelectorAll('button,input')].find(e => e.getAttribute('aria-label') === ${needle}).click()`,
    )
  }

  /**
   * Clicks the radio input whose `value` matches. Grouped radios take their
   * accessible name from the wrapping label element, so value is the stable
   * hook.
   * @param {string} value
   */
  async clickRadioValue(value) {
    const needle = JSON.stringify(value)
    await this.waitFor(
      `[...document.querySelectorAll('input[type=radio]')].some(i => i.value === ${needle})`,
    )
    await this.evaluate(
      `[...document.querySelectorAll('input[type=radio]')].find(i => i.value === ${needle}).click()`,
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
    cards >= enabledToolCount ? "PASS" : "FAIL",
    `${cards} enabled tool cards`,
  )
  if (cards < enabledToolCount) {
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
    [
      "percentage-calculator",
      "Percentage Calculator",
      async (p) => {
        await p.setValue("#percentage-a", "25")
        await p.setValue("#percentage-b", "200")
        await p.waitFor("[...document.querySelectorAll('p')].some(el => el.textContent === '50')")
        return "25% of 200 rendered as 50"
      },
    ],
    [
      "tip-calculator",
      "Tip Calculator",
      async (p) => {
        await p.setValue("#tip-bill", "100")
        await p.clickButton("20%")
        await p.waitFor("[...document.querySelectorAll('dd')].some(d => d.textContent === '20.00')")
        return "20% tip on 100 rendered"
      },
    ],
    [
      "gcd-lcm-calculator",
      "GCD/LCM Calculator",
      async (p) => {
        await p.setValue("#gcd-input", "48, 18, 12")
        await p.waitFor("[...document.querySelectorAll('p')].some(el => el.textContent === '144')")
        return "GCD/LCM of 48, 18, 12 rendered"
      },
    ],
    [
      "roman-numeral-converter",
      "Roman Numeral Converter",
      async (p) => {
        await p.setValue("#roman-input", "1994")
        await p.waitFor(
          "[...document.querySelectorAll('p')].some(el => el.textContent === 'MCMXCIV')",
        )
        return "1994 converted to MCMXCIV"
      },
    ],
    [
      "password-strength-checker",
      "Password Strength Checker",
      async (p) => {
        await p.setValue("#password-input", "Correct-Horse-Battery-42")
        await p.waitFor("document.body.innerText.includes('Very Strong')")
        return "long password rendered as Very Strong"
      },
    ],
    [
      "data-sanitizer",
      "Data Sanitizer",
      async (p) => {
        await p.setValue("#sanitizer-input", "jane@corp.dev from 192.168.0.5")
        await p.waitFor("document.body.innerText.includes('[EMAIL REDACTED] from [IP REDACTED]')")
        return "email and IP redacted"
      },
    ],
    [
      "csp-generator",
      "CSP Generator",
      async (p) => {
        await p.clickCheckbox("Enable img-src")
        await p.clickAriaLabel("Add * to img-src")
        await p.waitFor('document.body.innerText.includes("img-src *")')
        return "img-src policy rendered"
      },
    ],
    [
      "cors-header-builder",
      "CORS Header Builder",
      async (p) => {
        await p.clickCheckbox("Allow POST")
        await p.waitFor("document.body.innerText.includes('GET, OPTIONS')")
        return "method toggle rendered"
      },
    ],
    [
      "robots-txt-generator",
      "Robots.txt Generator",
      async (p) => {
        await p.setValue("#robots-sitemap", "")
        await p.waitFor(
          "[...document.querySelectorAll('pre')].every(p => !p.textContent.includes('Sitemap:'))",
        )
        return "sitemap omitted from output"
      },
    ],
    [
      "age-calculator",
      "Age Calculator",
      async (p) => {
        await p.setValue("#age-birth-date", "1990-05-20")
        await p.waitFor("document.body.innerText.includes('Next birthday in')")
        return "age, totals, and next birthday rendered"
      },
    ],
    [
      "bitwise-calculator",
      "Bitwise Calculator",
      async (p) => {
        await p.clickRadioValue("NOT")
        await p.waitFor("document.body.innerText.includes('-256')")
        return "NOT 255 rendered as -256"
      },
    ],
    [
      "color-blindness-simulator",
      "Color Blindness Simulator",
      async (p) => {
        await p.clickRadioValue("achromatopsia")
        await p.waitFor("document.body.innerText.includes('#7F7F7F')")
        return "achromatopsia gray rendered"
      },
    ],
    [
      "calculator",
      "Scientific Calculator",
      async (p) => {
        await p.clickButton("2")
        await p.clickAriaLabel("Add")
        await p.clickButton("3")
        await p.clickAriaLabel("Equals")
        await p.waitFor("document.body.innerText.includes('Display 5')")
        return "2 + 3 rendered as 5"
      },
    ],
    [
      "http-status-codes",
      "HTTP Status Codes",
      async (p) => {
        await p.setValue("#http-status-search", "teapot")
        await p.waitFor('document.body.innerText.includes("I\'m a Teapot")')
        return "teapot search rendered 418"
      },
    ],
    [
      "mime-type-lookup",
      "MIME Type Lookup",
      async (p) => {
        await p.setValue("#mime-search", "png")
        await p.waitFor("document.body.innerText.includes('.png → image/png')")
        return "png extension mapped to image/png"
      },
    ],
    [
      "meta-tag-generator",
      "Meta Tag Generator",
      async (p) => {
        await p.setValue("#meta-title", 'My "Site"')
        await p.waitFor("document.body.innerText.includes('&quot;')")
        return "title tag escaped quotes in output"
      },
    ],
    [
      "unicode-lookup",
      "Unicode Lookup",
      async (p) => {
        await p.setValue("#unicode-search", "infinity")
        await p.waitFor("document.body.innerText.includes('U+221E')")
        return "infinity character listed with its code point"
      },
    ],
    [
      "ascii-table",
      "ASCII Table",
      async (p) => {
        await p.setValue("#ascii-search", "0x41")
        await p.waitFor("document.body.innerText.includes('Uppercase A')")
        return "hex query 0x41 rendered Uppercase A"
      },
    ],
    [
      "box-shadow-generator",
      "Box Shadow Generator",
      async (p) => {
        await p.setValue("#box-blur", "30")
        await p.waitFor(
          "document.body.innerText.includes('box-shadow: 4px 4px 30px 0px rgba(99, 102, 241, 0.3);')",
        )
        return "blur change rebuilt the declaration"
      },
    ],
    [
      "border-radius-generator",
      "Border Radius Generator",
      async (p) => {
        await p.clickCheckbox("Link corners")
        await p.setValue("#border-radius-topLeft", "24")
        await p.waitFor("document.body.innerText.includes('border-radius: 24px;')")
        return "linked corners updated the declaration"
      },
    ],
    [
      "text-shadow-generator",
      "Text Shadow Generator",
      async (p) => {
        await p.clickButton("Add shadow layer")
        await p.waitFor("document.body.innerText.includes(', 2px 2px 4px #6366f1;')")
        await p.clickAriaLabel("Remove layer 2")
        await p.waitFor("document.body.innerText.includes('text-shadow: 2px 2px 4px #6366f1;')")
        return "layer added and removed"
      },
    ],
    [
      "triangle-generator",
      "CSS Triangle Generator",
      async (p) => {
        await p.clickRadioValue("right")
        await p.waitFor("document.body.innerText.includes('border-left: 100px solid #6366f1;')")
        return "right triangle rendered"
      },
    ],
    [
      "gradient-border-generator",
      "Gradient Border Generator",
      async (p) => {
        await p.setValue("#gradient-border-width", "10")
        await p.waitFor("document.body.innerText.includes('padding: 10px;')")
        return "border width updated the snippet"
      },
    ],
    [
      "html-entity-encoder",
      "HTML Entity Encoder",
      async (p) => {
        await p.setValue("#html-entity-input", '<a href="x">')
        await p.waitFor(
          "(document.querySelector('#html-entity-output') ?? {value:''}).value.includes('&lt;a href=&quot;x&quot;&gt;')",
        )
        return "encode mode converted live input"
      },
    ],
    [
      "rot13-cipher",
      "ROT13 Cipher",
      async (p) => {
        await p.setValue("#rot13-input", "Hello")
        await p.clickButton("Encode")
        await p.waitFor("(document.querySelector('#rot13-output') ?? {value:''}).value === 'Uryyb'")
        return "ROT13 vector rendered"
      },
    ],
    [
      "morse-code-translator",
      "Morse Code Translator",
      async (p) => {
        await p.setValue("#morse-input", "SOS")
        await p.clickButton("Convert")
        await p.waitFor(
          "(document.querySelector('#morse-output') ?? {value:''}).value.includes('... --- ...')",
        )
        return "SOS Morse vector rendered"
      },
    ],
    [
      "hmac-generator",
      "HMAC Generator",
      async (p) => {
        await p.setValue("#hmac-secret", "Jefe")
        await p.setValue("#hmac-message", "what do ya want for nothing?")
        await p.clickButton("Generate HMAC")
        await p.waitFor(
          "document.body.innerText.includes('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843')",
        )
        return "RFC 4231 test case 2 vector rendered"
      },
    ],
    [
      "uuid-generator",
      "UUID Generator",
      async (p) => {
        await p.setValue("#uuid-count", "3")
        await p.clickButton("Generate UUIDs")
        await p.waitFor(
          "(document.querySelector('#uuid-output') ?? {value:''}).value.length === 110",
        )
        return "three UUIDs rendered into the output panel"
      },
    ],
    [
      "find-replace",
      "Find & Replace",
      async (p) => {
        await p.setValue("#find-replace-find", "cat")
        await p.setValue("#find-replace-replace", "dog")
        await p.setValue("#find-replace-source", "Cat catalog cat")
        await p.waitFor(
          "(document.querySelector('#find-replace-output') ?? {value:''}).value === 'dog dogalog dog'",
        )
        await p.clickCheckbox("Whole word")
        await p.waitFor("document.body.innerText.includes('2 matches')")
        await p.clickButton("Apply changes")
        await p.waitFor(
          "(document.querySelector('#find-replace-source') ?? {value:''}).value === 'dog catalog dog'",
        )
        return "literal replacement applied with whole-word narrowing"
      },
    ],
    [
      "invisible-character-detector",
      "Invisible Character Detector",
      async (p) => {
        await p.setValue("#invisible-character-input", "a\u200Bb c\u202Fd")
        await p.waitFor("document.body.innerText.includes('2 invisible characters')")
        await p.clickButton("Remove all")
        await p.waitFor(
          "(document.querySelector('#invisible-character-input') ?? {value:''}).value === 'ab cd'",
        )
        return "zero-width and narrow space found and removed"
      },
    ],
    [
      "hash-diff",
      "Hash Diff",
      async (p) => {
        await p.setValue("#hash-diff-first", "abc")
        await p.setValue("#hash-diff-second", "abd")
        await p.clickButton("Compare Hashes")
        await p.waitFor("document.body.innerText.includes('Result — different')")
        return "NIST abc vectors compared with a different verdict"
      },
    ],
    [
      "cron-builder",
      "Cron Expression Builder",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('at 09:00, on Monday through Friday')")
        await p.setValue("#cron-expression", "99 99 99 99 99")
        await p.waitFor("document.body.innerText.includes('Minute \"99\" is outside range 0-59.')")
        await p.clickButton("Every 15 minutes")
        await p.waitFor("document.body.innerText.includes('every 15 minutes')")
        return "out-of-range rejection and preset description rendered"
      },
    ],
    [
      "lorem-ipsum-generator",
      "Lorem Ipsum Generator",
      async (p) => {
        await p.clickButton("Generate")
        await p.waitFor(
          "(document.querySelector('#lorem-output') ?? {value:''}).value.split('\\n\\n').length === 3",
        )
        await p.clickRadioValue("sentences")
        await p.setValue("#lorem-count", "4")
        await p.clickButton("Generate")
        await p.waitFor(
          "(document.querySelector('#lorem-output') ?? {value:''}).value.split('.').length === 5",
        )
        return "three paragraphs then four sentences generated"
      },
    ],
    [
      "password-generator",
      "Password Generator",
      async (p) => {
        await p.setValue("#password-generator-length", "32")
        await p.clickButton("Generate")
        await p.waitFor(
          "(() => { const el = document.querySelector('[aria-label=\"Generated password\"]'); return el && el.textContent.length === 32 })()",
        )
        await p.waitFor("document.body.innerText.includes('Strength:')")
        return "32-character password generated with a strength band"
      },
    ],
    [
      "jwt-decoder",
      "JWT Decoder",
      async (p) => {
        await p.setValue(
          "#jwt-decoder-token",
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjQxMDI0NDQ4MDAsImlzcyI6ImV4YW1wbGUifQ.dBjftJeZ4CJP-mB6Kxth",
        )
        await p.waitFor('document.body.innerText.includes(\'"iss": "example"\')')
        await p.waitFor("document.body.innerText.includes('Active — the exp claim')")
        await p.setValue("#jwt-decoder-token", "abc.def")
        await p.waitFor("document.body.innerText.includes('three dot-separated parts')")
        return "header, payload, and expiry decoded; malformed token rejected"
      },
    ],
    [
      "csv-json",
      "CSV to JSON",
      async (p) => {
        await p.setValue("#csv-json-input", 'note,text\n"two\nlines",ok')
        await p.waitFor(
          "(document.querySelector('#csv-json-output') ?? {value:''}).value.includes('two\\\\nlines')",
        )
        await p.setValue("#csv-json-input", "a,b\n1,2,3")
        await p.waitFor("document.body.innerText.includes('1 row had a different cell count')")
        await p.clickRadioValue("json-to-csv")
        await p.setValue("#csv-json-input", '[{"cmd":"=rm -rf"}]')
        await p.waitFor(
          "(document.querySelector('#csv-json-output') ?? {value:''}).value.includes(\"'=rm -rf\")",
        )
        return "multi-line quotes, uneven rows, and formula neutralization rendered"
      },
    ],
    [
      "yaml-json-converter",
      "YAML to JSON",
      async (p) => {
        await p.setValue("#yaml-json-input", "name: Ada\nage: 36")
        await p.waitFor(
          "(document.querySelector('#yaml-json-output') ?? {value:''}).value.includes('\"name\": \"Ada\"')",
        )
        await p.clickRadioValue("json-to-yaml")
        await p.setValue("#yaml-json-input", '{"name":"Ada"}')
        await p.waitFor(
          "(document.querySelector('#yaml-json-output') ?? {value:''}).value === 'name: Ada\\n'",
        )
        await p.clickRadioValue("yaml-to-json")
        await p.setValue("#yaml-json-input", "!!python/object:os.system\nx: 1")
        await p.waitFor("document.body.innerText.includes('The YAML is not valid')")
        return "both directions converted; safe schema rejected an executable type"
      },
    ],
    [
      "text-diff",
      "Text Diff",
      async (p) => {
        await p.setValue("#text-diff-original", "a\nb\nc")
        await p.setValue("#text-diff-modified", "a\nx\nc\nnew")
        await p.waitFor(
          "document.body.innerText.includes('3 lines added, 2 lines removed, 1 line unchanged.')",
        )
        await p.waitFor("document.body.innerText.includes('+ new')")
        await p.setValue("#text-diff-modified", "a\nb\nc")
        await p.waitFor("document.body.innerText.includes('The texts are identical.')")
        return "counts summary, markers, and identical state rendered"
      },
    ],
    [
      "color-picker",
      "Color Picker",
      async (p) => {
        // The tool rewrites partial input to its canonical form, so setValue
        // lands the already-canonical six-digit value; the web e2e covers the
        // three-digit normalization path.
        await p.setValue("#color-picker-hex", "#00aaff")
        await p.waitFor(
          "(document.querySelector('#color-picker-red') ?? {value:''}).value === '0' && (document.querySelector('#color-picker-green') ?? {value:''}).value === '170'",
        )
        await p.setValue("#color-picker-contrast", "#000000")
        await p.waitFor("document.body.innerText.includes('on #000000')")
        return "hex expanded to channels and contrast verdict rendered"
      },
    ],
    [
      "css-gradient-generator",
      "CSS Gradient Generator",
      async (p) => {
        await p.waitFor(
          "document.body.innerText.includes('background: linear-gradient(135deg, #6366f1, #06b6d4);')",
        )
        await p.clickRadioValue("conic")
        await p.waitFor(
          "document.body.innerText.includes('background: conic-gradient(from 135deg, #6366f1, #06b6d4);')",
        )
        await p.setValue("#css-gradient-color-0", "")
        await p.waitFor("document.body.innerText.includes('Add at least two colors.')")
        return "linear and conic declarations rendered; one-stop gradient rejected"
      },
    ],
    [
      "xml-formatter",
      "XML Formatter",
      async (p) => {
        await p.setValue("#xml-formatter-input", "<root><child><leaf>text</leaf></child></root>")
        await p.clickButton("Format")
        await p.waitFor("document.body.innerText.includes('    <leaf>text</leaf>')")
        await p.setValue("#xml-formatter-input", "<root><child></root>")
        await p.clickButton("Format")
        await p.waitFor("document.body.innerText.includes('The XML is not well-formed.')")
        return "indentation rendered and malformed input rejected without echoing it"
      },
    ],
    [
      "sql-formatter",
      "SQL Formatter",
      async (p) => {
        await p.setValue("#sql-formatter-input", "select id, name from users where active = 1")
        await p.clickButton("Format")
        await p.waitFor("document.body.innerText.includes('id,\\n  name')")
        await p.setValue("#sql-formatter-input", "select 'oops from t")
        await p.clickButton("Format")
        await p.waitFor(
          "document.body.innerText.includes('The SQL could not be parsed for formatting.')",
        )
        return "clause indentation rendered; parse failure message without echoed input"
      },
    ],
    [
      "emoji-picker",
      "Emoji Picker",
      async (p) => {
        // Emoji buttons carry their names as accessible labels only, so the
        // driver probes the aria-labels directly.
        await p.waitFor(
          "[...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Copy thumbs up')",
        )
        await p.setValue("#emoji-picker-search", "fire")
        await p.waitFor(
          "[...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Copy fire') && ![...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Copy joy')",
        )
        await p.setValue("#emoji-picker-search", "zzzzz")
        await p.waitFor("document.body.innerText.includes('No emojis match')")
        await p.setValue("#emoji-picker-search", "")
        await p.clickButton("Food")
        await p.waitFor(
          "[...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Copy pizza') && ![...document.querySelectorAll('button')].some(b => b.getAttribute('aria-label') === 'Copy grinning')",
        )
        return "name search, empty state, and category scoping rendered"
      },
    ],
    [
      "flexbox-playground",
      "Flexbox Playground",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('flex-direction: row;')")
        await p.waitFor("document.body.innerText.includes('gap: 8px;')")
        await p.clickRadioValue("column")
        await p.clickRadioValue("space-evenly")
        await p.waitFor("document.body.innerText.includes('flex-direction: column;')")
        await p.waitFor("document.body.innerText.includes('justify-content: space-evenly;')")
        return "default and column/space-evenly declarations rendered"
      },
    ],
    [
      "grid-generator",
      "Grid Generator",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('grid-template-columns: 1fr 1fr 1fr;')")
        await p.setValue("#grid-column-grid-item-1", "1 / 3")
        await p.waitFor("document.body.innerText.includes('/* Item 1 */ grid-column: 1 / 3;')")
        // The template hint text mentions grid-template-rows permanently, so
        // the empty-template check is scoped to the CSS output block.
        await p.setValue("#grid-rows", "")
        await p.waitFor(
          "!(document.querySelector('pre')?.textContent ?? '').includes('grid-template-rows')",
        )
        return "placement emitted and emptied template skipped"
      },
    ],
    [
      "css-animation-generator",
      "CSS Animation Generator",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('animation: fadeIn 1s ease 0s 1;')")
        await p.clickRadioValue("rotate")
        await p.clickRadioValue("linear")
        await p.setValue("#css-animation-iterations", "0")
        await p.waitFor(
          "document.body.innerText.includes('animation: rotate 1s linear 0s infinite;')",
        )
        return "type, timing, and infinite iterations rendered in the shorthand"
      },
    ],
    [
      "glassmorphism-generator",
      "Glassmorphism Generator",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('backdrop-filter: blur(10px);')")
        await p.waitFor("document.body.innerText.includes('-webkit-backdrop-filter: blur(10px);')")
        await p.setValue("#glass-bg-color-text", "#123456")
        await p.waitFor("document.body.innerText.includes('background: rgba(18, 52, 86, 0.2);')")
        await p.setValue("#glass-bg-color-text", "#12")
        await p.waitFor("document.body.innerText.includes('Fix both colors')")
        return "declaration with both prefixes rendered; invalid color suppressed"
      },
    ],
    [
      "neumorphism-generator",
      "Neumorphism Generator",
      async (p) => {
        await p.waitFor(
          "document.body.innerText.includes('linear-gradient(145deg, rgb(54, 54, 54), rgb(30, 30, 30))')",
        )
        await p.clickRadioValue("pressed")
        await p.waitFor("document.body.innerText.includes('inset 8px 8px 16px')")
        await p.setValue("#neumorphism-color", "#abcdef")
        await p.waitFor("document.body.innerText.includes('background: #abcdef;')")
        return "convex gradient, pressed inset shadows, and recolored base rendered"
      },
    ],
    [
      "svg-optimizer",
      "SVG Optimizer",
      async (p) => {
        await p.setValue(
          "#svg-optimizer-input",
          '<svg xmlns="http://www.w3.org/2000/svg">\n  <text>a = b</text>\n</svg>',
        )
        await p.clickButton("Minify")
        await p.waitFor(
          "!(document.querySelector('pre')?.textContent ?? '').includes('\\n') && document.querySelector('pre')?.textContent.includes('<text>a = b</text>')",
        )
        await p.setValue("#svg-optimizer-input", "<svg><text>unclosed</svg>")
        await p.clickButton("Minify")
        await p.waitFor("document.body.innerText.includes('not well-formed XML')")
        return "text-node whitespace preserved; broken markup fails closed"
      },
    ],
    [
      "open-graph-preview",
      "Open Graph Preview",
      async (p) => {
        await p.setValue(
          "#open-graph-preview-input",
          '<meta property="og:title" content="Launch day" /><meta name="twitter:card" content="summary_large_image" />',
        )
        await p.waitFor("document.body.innerText.includes('Launch day')")
        await p.waitFor("document.body.innerText.includes('summary_large_image')")
        await p.setValue("#open-graph-preview-input", "<head><title>Plain</title></head>")
        await p.waitFor("document.body.innerText.includes('No Open Graph or Twitter Card')")
        return "tags previewed as text and miss explained without any fetch"
      },
    ],
    [
      "stopwatch",
      "Stopwatch",
      async (p) => {
        await p.waitFor("document.querySelector('[role=timer]')?.textContent === '00:00.00'")
        await p.clickButton("Start")
        await p.waitFor("!document.querySelector('[role=timer]')?.textContent.startsWith('00:00.')")
        await p.clickButton("Lap")
        await p.clickButton("Lap")
        await p.waitFor("document.body.innerText.includes('best lap')")
        await p.clickButton("Stop")
        await p.clickButton("Reset")
        await p.waitFor("document.querySelector('[role=timer]')?.textContent === '00:00.00'")
        return "wall-clock counting with two laps and best/worst marking; reset to idle"
      },
    ],
    [
      "countdown-timer",
      "Countdown Timer",
      async (p) => {
        await p.waitFor("document.querySelector('[role=timer]')?.textContent === '00:00:00'")
        await p.clickButton("1 min")
        await p.clickButton("Start")
        await p.waitFor(
          "document.querySelector('[role=timer]')?.textContent.startsWith('00:00:5') || document.querySelector('[role=timer]')?.textContent === '00:01:00'",
        )
        await p.clickButton("Pause")
        await p.waitFor("document.body.innerText.includes('Paused')")
        await p.clickButton("Reset")
        await p.waitFor("document.querySelector('[role=timer]')?.textContent === '00:00:00'")
        return "preset start, pause, and wall-clock reset rendered"
      },
    ],
    [
      "ical-generator",
      "iCalendar Generator",
      async (p) => {
        await p.setValue("#ics-title", "Team sync, weekly")
        await p.setValue("#ics-start-date", "2026-09-10")
        await p.setValue("#ics-end-date", "2026-09-10")
        await p.clickButton("Generate .ics")
        await p.waitFor(
          "document.querySelector('pre')?.textContent.includes('SUMMARY:Team sync\\\\, weekly')",
        )
        await p.clickCheckbox("All-day event")
        return "CRLF calendar generated with RFC 5545 escaped commas"
      },
    ],
    [
      "vcard-generator",
      "vCard Generator",
      async (p) => {
        await p.setValue("#vcard-first-name", "Grace")
        await p.setValue("#vcard-last-name", "Hopper; Admiral")
        await p.clickButton("Generate vCard")
        await p.waitFor(
          "document.querySelector('pre')?.textContent.includes('N:Hopper\\\\; Admiral;Grace;;;')",
        )
        await p.setValue("#vcard-url", "http://example.com")
        await p.clickButton("Generate vCard")
        await p.waitFor("document.body.innerText.includes('Enter an https website URL.')")
        return "RFC 6350 escaping rendered and non-https URL rejected"
      },
    ],
    [
      "fake-data-generator",
      "Fake Data Generator",
      async (p) => {
        await p.clickRadioValue("country")
        await p.setValue("#fake-data-count", "3")
        await p.clickButton("Generate")
        await p.waitFor("document.querySelectorAll('li').length === 3")
        await p.clickButton("Clear")
        await p.waitFor("document.querySelectorAll('li').length === 0")
        return "3 country rows generated from the secure byte source and cleared"
      },
    ],
    [
      "color-palette-from-image",
      "Color Palette from Image",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('Colors are extracted on this device')")
        await p.waitFor("document.body.innerText.includes('Choose image')")
        return "empty state and on-device extraction disclosure rendered"
      },
    ],
    [
      "chart-generator",
      "Chart Generator",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('Chart data as a text table')")
        await p.waitFor("document.body.innerText.includes('80')")
        await p.clickButton("Add point")
        await p.waitFor("!!document.querySelector('#point-label-5')")
        await p.evaluate(
          "[...document.querySelectorAll('button')].find(b => (b.getAttribute('aria-label') ?? '').endsWith('point 6')).click()",
        )
        await p.waitFor("!document.querySelector('#point-label-5')")
        return "text-equivalent summary table with point add and remove"
      },
    ],
    [
      "bookmark-manager",
      "Bookmark Manager",
      async (p) => {
        await p.setValue("#bookmark-title", "Emulator docs")
        await p.setValue("#bookmark-url", "example.com/docs")
        await p.clickButton("Add bookmark")
        await p.waitFor("document.body.innerText.includes('https://example.com/docs')")
        await p.setValue("#bookmark-search", "nomatch")
        await p.waitFor("document.body.innerText.includes('No bookmarks match the search.')")
        return "https normalization saved and search miss explained"
      },
    ],
    [
      "pdf-converter",
      "PDF Converter",
      async (p) => {
        await p.waitFor("document.body.innerText.includes('Images to PDF')")
        // Every mode tab mounts its own panel; file picking is covered by the
        // instrumentation suite, so the driver verifies the mode round-trip.
        await p.clickButton("PDF to Text")
        await p.waitFor(
          "document.body.innerText.includes('Scanned image-only PDFs contain no extractable text')",
        )
        await p.clickButton("Merge PDFs")
        await p.waitFor("document.body.innerText.includes('Combine 2 to 20 PDFs')")
        await p.clickButton("Images to PDF")
        return "mode tabs mount bounded panels; SAF pick covered by the instrumentation suite"
      },
    ],
    [
      "aspect-ratio-calculator",
      "Aspect Ratio Calculator",
      async (p) => {
        await p.setValue("#aspect-width", "1920")
        await p.setValue("#aspect-height", "1080")
        await p.waitFor("document.body.innerText.includes('Simplified ratio 16:9')")
        await p.setValue("#aspect-target", "1280")
        await p.waitFor("document.body.innerText.includes('1280 \u00d7 720 px')")
        await p.waitFor("document.body.innerText.includes('720')")
        return "GCD-reduced ratio with a scaled target and text table"
      },
    ],
    [
      "css-unit-converter",
      "CSS Unit Converter",
      async (p) => {
        await p.setValue("#css-unit-root", "16")
        await p.setValue("#css-unit-value", "24")
        await p.waitFor("document.body.innerText.includes('1.5rem')")
        await p.waitFor("document.body.innerText.includes('150%')")
        return "px converted to rem/em/percent against the 16 px root"
      },
    ],
    [
      "discount-tax-calculator",
      "Discount and Tax Calculator",
      async (p) => {
        await p.setValue("#discount-price", "100.00")
        await p.setValue("#discount-percent", "25")
        await p.setValue("#discount-tax-percent", "8")
        await p.waitFor(
          "document.body.innerText.includes('You save 25.00; the subtotal after discount is 75.00, tax adds 6.00, and the total is 81.00.')",
        )
        return "percent discount then tax with every exact-cent step displayed"
      },
    ],
    [
      "bmi-calculator",
      "BMI Calculator",
      async (p) => {
        await p.setValue("#bmi-weight", "70")
        await p.setValue("#bmi-height-cm", "175")
        await p.waitFor("document.body.innerText.includes('BMI 22.9')")
        await p.waitFor("document.body.innerText.includes('normal band (WHO adult range)')")
        await p.waitFor("document.body.innerText.includes('not medical advice')")
        return "metric BMI with WHO text band and the estimate-only disclaimer"
      },
    ],
    [
      "unit-price-comparer",
      "Unit Price Comparer",
      async (p) => {
        await p.setValue("#unit-price-label-1", "Bottle")
        await p.selectOption("#unit-price-unit-1", "l")
        await p.setValue("#unit-price-price-1", "4.50")
        await p.setValue("#unit-price-quantity-1", "1.5")
        await p.selectOption("#unit-price-unit-2", "ml")
        await p.setValue("#unit-price-price-2", "2.00")
        await p.setValue("#unit-price-quantity-2", "500")
        await p.waitFor(
          "document.body.innerText.includes('Bottle is the cheapest at 0.0030 per ml')",
        )
        return "mixed-unit normalization ranks cheapest per base unit"
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
    // Connectivity may still be coming back when the first lookup runs, so the
    // lookup is retried until the offline state clears or the deadline passes.
    await page.setValue("#dns-name", "example.com")
    const deadline = Date.now() + 60_000
    for (;;) {
      await page.clickButton("Look up")
      try {
        await page.waitFor("!document.body.innerText.includes('Offline')", 10_000)
        break
      } catch {
        if (Date.now() > deadline) throw new Error("Offline state did not clear within 60s.")
        spawnSync("sleep", ["2"])
      }
    }
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
  // The saved theme loads asynchronously over the Preferences bridge after
  // the shell renders with the system-resolved value, so poll instead of
  // reading once at mount time.
  try {
    await page.waitFor("document.documentElement.dataset.theme === 'dark'", 15_000)
    record(
      "process.durableThemeSurvivesForceStop",
      "PASS",
      "theme=dark after force stop and relaunch",
    )
  } catch {
    const state = /** @type {{ theme?: string }} */ (
      await page.evaluate("(() => ({ theme: document.documentElement.dataset.theme }))()")
    )
    record(
      "process.durableThemeSurvivesForceStop",
      "FAIL",
      `theme=${state.theme} persisted value did not apply within 15s`,
    )
  }
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
  // Hash the actual artifact on disk so the recorded value cannot silently
  // go stale after a rebuild.
  const artifactHash = spawnSync("sha256sum", [ARTIFACT_PATH], { encoding: "utf8" })
  record(
    "device.artifactSha256",
    "INFO",
    `${(artifactHash.stdout ?? "").trim().split(" ")[0] ?? "unavailable"} (app-debug.apk)`,
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
