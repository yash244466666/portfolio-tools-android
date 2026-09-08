/**
 * Generates a CycloneDX 1.5 software bill of materials for the production
 * dependency tree into docs/certification/sbom/cyclonedx.json from the pnpm
 * working tree (deduplicated name@version components with package.json
 * license metadata and package URLs), plus a human-readable summary.
 *
 * pnpm's node_modules layout is not understood by npm-based SBOM tools, so
 * the tree comes from `pnpm ls --prod --json`. Licenses are best-effort from
 * package metadata; `pnpm licenses list --prod` remains the authoritative
 * inventory recorded in the security audit document.
 *
 * Run from the repository root: node scripts/build-sbom.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { randomUUID } from "node:crypto"
import { execSync } from "node:child_process"

const OUTPUT = "docs/certification/sbom/cyclonedx.json"
const appRaw = /** @type {unknown} */ (JSON.parse(readFileSync("package.json", "utf8")))
const APP = /** @type {{ name: string, version: string }} */ (appRaw)

/**
 * @typedef {{
 *   from: string,
 *   version: string,
 *   path?: string,
 *   dependencies?: Record<string, PnpmDep>,
 * }} PnpmDep
 * @typedef {{
 *   name: string,
 *   version: string,
 *   dependencies?: Record<string, PnpmDep>,
 * }} PnpmLsRoot
 */

/** @returns {Map<string, { path?: string, direct: boolean }>} */
function productionComponents() {
  const raw = /** @type {string} */ (
    execSync("pnpm ls --prod --json --depth 100", { encoding: "utf8" })
  )
  const lsRaw = /** @type {unknown} */ (JSON.parse(raw))
  const ls = /** @type {PnpmLsRoot[]} */ (lsRaw)
  /** @type {Map<string, { path?: string, direct: boolean }>} */
  const components = new Map()
  const direct = new Set()
  for (const root of ls) {
    for (const name of Object.keys(root.dependencies ?? {})) direct.add(name)
    /**
     * @param {Record<string, PnpmDep> | undefined} [deps]
     */
    const walk = (deps) => {
      for (const dep of Object.values(deps ?? {})) {
        const key = `${dep.from}@${dep.version}`
        if (!components.has(key)) {
          components.set(key, { path: dep.path, direct: direct.has(dep.from) })
          walk(dep.dependencies)
        }
      }
    }
    walk(root.dependencies)
  }
  return components
}

/**
 * @param {string | undefined} path
 * @returns {string | null}
 */
function licenseFor(path) {
  if (!path) return null
  try {
    const pkgRaw = /** @type {unknown} */ (JSON.parse(readFileSync(`${path}/package.json`, "utf8")))
    const pkg = /** @type {{ license?: unknown, licenses?: unknown }} */ (pkgRaw)
    const license = pkg.license ?? pkg.licenses
    if (typeof license === "string") return license
    if (Array.isArray(license)) {
      const entries = /** @type {{ type?: unknown }[]} */ (license)
      return entries.map((entry) => String(entry.type)).join(" OR ")
    }
  } catch {
    return null
  }
  return null
}

/** @type {{ type: string, name: string, version: string, purl: string, licenses?: unknown }[]} */
const components = []
for (const [key, info] of [...productionComponents().entries()].sort(([a], [b]) =>
  a.localeCompare(b),
)) {
  const at = key.lastIndexOf("@")
  const name = key.slice(0, at)
  const version = key.slice(at + 1)
  const license = licenseFor(info.path)
  components.push({
    type: "library",
    name,
    version,
    purl: `pkg:npm/${name}@${version}`,
    ...(license ? { licenses: [{ license: { expression: license } }] } : {}),
    ...(info.direct ? { scope: "required" } : {}),
  })
}

const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  serialNumber: `urn:uuid:${randomUUID()}`,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: { components: [{ type: "application", name: "scripts/build-sbom.mjs" }] },
    component: {
      type: "application",
      name: APP.name,
      version: APP.version,
      description: "Yash Tools: offline-first Android utility app (Capacitor/React).",
    },
  },
  components,
}

mkdirSync("docs/certification/sbom", { recursive: true })
writeFileSync(OUTPUT, `${JSON.stringify(sbom, null, 2)}\n`)
console.log(
  `SBOM written to ${OUTPUT}: ${components.length} production components from the pnpm tree.`,
)
