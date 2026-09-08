/**
 * Builds the per-tool automated regression matrix into
 * docs/certification/regression-matrix.md (the generated table between the
 * matrix markers) and exits non-zero when any enabled tool lacks its
 * independent test layers, so the matrix doubles as a coverage gate.
 *
 * Run from the repository root: node scripts/build-regression-matrix.mjs
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const REGISTRY = "src/tools/registry.ts"
const SPEC = "e2e/foundation.spec.ts"
const DRIVER = "scripts/device-checklist-emulator.mjs"
const DOC = "docs/certification/regression-matrix.md"
const START = "<!-- regression-matrix:generated:start -->"
const END = "<!-- regression-matrix:generated:end -->"

/** Registry id -> source directory when the two names diverge. */
const DIRECTORY_ALIASES = /** @type {Record<string, string>} */ ({
  "base64-tool": "base64-converter",
})

/**
 * Enabled tools whose pure logic lives outside their own tool directory,
 * mapped to the repository paths whose test files are their independent
 * correctness oracle. A tool counts as covered when these paths exist.
 */
const SHARED_TEST_PATHS = /** @type {Record<string, string[]>} */ ({
  // Character Counter intentionally shares the word-counter code-point engine;
  // its vectors run there.
  "character-counter": ["src/tools/word-counter/text-stats.test.ts"],
  // File Hash Checker's digest engine is the versioned native content-read
  // bridge: shared JS helpers plus native SHA policy vectors.
  "file-hash-checker": [
    "src/platform/shared/files.test.ts",
    "android/app/src/test/java/dev/yash/tools/ContentReadPolicyTest.java",
  ],
})

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   category: string,
 *   network: string,
 * }} RegistryTool
 */

/** @returns {RegistryTool[]} */
function readEnabledTools() {
  const registry = readFileSync(REGISTRY, "utf8")
  // Parse only the tools array, not the categories or other id-bearing lists.
  const toolsBlock = /export const tools:[\s\S]*?\n\] as const/.exec(registry)?.[0]
  if (!toolsBlock) throw new Error("Could not locate the tools array in the registry")
  /** @type {RegistryTool[]} */
  const tools = []
  for (const match of toolsBlock.matchAll(
    /id:\s*"([a-z0-9-]+)"([\s\S]*?)(?=\n {2}\{|\n\] as const)/g,
  )) {
    const id = match[1]
    const body = match[2] ?? ""
    const status = /status:\s*"([a-z]+)"/.exec(body)?.[1]
    if (status !== "enabled" || !id) continue
    const label = /label:\s*"([^"]+)"/.exec(body)?.[1] ?? id
    const category = /category:\s*"([a-z]+)"/.exec(body)?.[1] ?? ""
    const network = /network:\s*(true|false)/.exec(body)?.[1] === "true" ? "network" : "local"
    tools.push({ id, label, category, network })
  }
  return tools
}

/**
 * @typedef {{
 *   pure: string[],
 *   component: string[],
 *   fixtures: boolean,
 * }} ToolTestFiles
 */

/**
 * @param {string} id
 * @returns {ToolTestFiles}
 */
function testFiles(id) {
  const dir = join("src/tools", DIRECTORY_ALIASES[id] ?? id)
  if (!existsSync(dir)) return { pure: [], component: [], fixtures: false }
  const files = readdirSync(dir)
  return {
    pure: files.filter((name) => /\.test\.ts$/.test(name)),
    component: files.filter((name) => /\.test\.tsx$/.test(name)),
    fixtures: existsSync(join(dir, "fixtures")),
  }
}

/** @returns {Set<string>} */
function e2eToolIds() {
  const spec = readFileSync(SPEC, "utf8")
  /** @type {Set<string>} */
  const ids = new Set()
  for (const match of spec.matchAll(/#\/tool\/([a-z0-9-]+)/g)) {
    const id = match[1]
    if (id) ids.add(id)
  }
  return ids
}

/** @returns {Set<string>} */
function driverToolIds() {
  const driver = readFileSync(DRIVER, "utf8")
  /** @type {Set<string>} */
  const ids = new Set()
  for (const match of driver.matchAll(
    /\[\s*\n?\s*"([a-z0-9-]+)",\s*\n?\s*"[^"]+",\s*\n?\s*async/g,
  )) {
    const id = match[1]
    if (id) ids.add(id)
  }
  return ids
}

/**
 * @typedef {{
 *   id: string,
 *   label: string,
 *   category: string,
 *   network: string,
 *   pure: number,
 *   pureShared: boolean,
 *   component: number,
 *   fixtures: boolean,
 *   e2e: boolean,
 *   artifact: boolean,
 * }} MatrixRow
 */

/** @type {string[]} */
const problems = []

/** @type {MatrixRow[]} */
const rows = readEnabledTools().map((tool) => {
  const files = testFiles(tool.id)
  const shared = SHARED_TEST_PATHS[tool.id] ?? []
  const sharedPresent = shared.length > 0 && shared.every((path) => existsSync(path))
  if (files.pure.length === 0 && !sharedPresent) {
    problems.push(`${tool.id}: no pure test file`)
  }
  const inE2e = e2eToolIds().has(tool.id)
  const onArtifact = driverToolIds().has(tool.id) || inE2e
  if (!onArtifact) problems.push(`${tool.id}: no E2E route or emulator driver check`)
  return {
    ...tool,
    pure: files.pure.length,
    pureShared: files.pure.length === 0 && sharedPresent,
    component: files.component.length,
    fixtures: files.fixtures,
    e2e: inE2e,
    artifact: onArtifact,
  }
})

/**
 * @param {string[]} cells
 * @returns {string}
 */
const line = (cells) => `| ${cells.join(" | ")} |`
const table = [
  "| Tool | ID | Category | Network | Pure tests | Component tests | Fixtures | E2E | Artifact interaction |",
  "| ---- | -- | -------- | ------- | ---------- | --------------- | -------- | --- | -------------------- |",
  ...rows.map((row) =>
    line([
      row.label,
      `\`${row.id}\``,
      row.category,
      row.network,
      row.pure > 0 ? String(row.pure) : "shared",
      String(row.component),
      row.fixtures ? "yes" : "no",
      row.e2e ? "yes" : "no",
      row.artifact ? "yes" : "no",
    ]),
  ),
].join("\n")

const summary = [
  `Registry: ${rows.length} enabled tools.`,
  `Pure test files: ${rows.filter((row) => row.pure > 0).length}/${rows.length}; ` +
    `component tests: ${rows.filter((row) => row.component > 0).length}/${rows.length}.`,
  `E2E route coverage: ${rows.filter((row) => row.e2e).length}/${rows.length}; ` +
    `installed-artifact interaction (emulator driver per-tool check or E2E): ` +
    `${rows.filter((row) => row.artifact).length}/${rows.length}.`,
].join("\n")

if (existsSync(DOC)) {
  const doc = readFileSync(DOC, "utf8")
  if (!doc.includes(START) || !doc.includes(END)) {
    throw new Error(`${DOC} is missing the ${START} / ${END} markers`)
  }
  const start = doc.indexOf(START) + START.length
  const end = doc.indexOf(END)
  writeFileSync(DOC, `${doc.slice(0, start)}\n\n${summary}\n\n${table}\n\n${doc.slice(end)}`)
} else {
  writeFileSync(
    DOC,
    ["# Automated regression matrix", "", START, "", summary, "", table, "", END, ""].join("\n"),
  )
}

if (problems.length > 0) {
  console.error(`Regression matrix incomplete (${problems.length} problem(s)):`)
  for (const problem of problems) console.error(`- ${problem}`)
  process.exit(1)
}
// Keep the generated table inside the repository's Prettier contract; fail
// loudly rather than leaving an unformatted file for format:check to catch.
const prettier = spawnSync("pnpm", ["exec", "prettier", "--write", DOC], { stdio: "inherit" })
if (prettier.error || prettier.status !== 0) {
  console.error("Could not run prettier on the generated matrix document.")
  process.exit(1)
}
console.log(`Regression matrix current for ${rows.length} enabled tools.`)
