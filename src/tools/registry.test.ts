import { tools } from "@/tools/registry"

/**
 * The approved public version-1 scope is 30 tools (ADR 0023, accepted 2026-09-15),
 * down from the 100 of ADR 0022. The list is enumerated here deliberately: it is the
 * oracle for the scope decision, so an accidental `enabled`/`removed` flip — or a new
 * tool slipping into the release manifest — fails the build instead of shipping.
 * Changing this list requires a superseding ADR.
 */
const approvedVersionOneScope = [
  // Everyday money and math
  "unit-converter",
  "currency-converter",
  "percentage-calculator",
  "tip-calculator",
  "discount-tax-calculator",
  "unit-price-comparer",
  "loan-emi-calculator",
  "fuel-trip-cost-calculator",
  "bmi-calculator",
  "calculator",
  // Time
  "stopwatch",
  "countdown-timer",
  "pomodoro-timer",
  "time-zone-converter",
  "date-difference-calculator",
  "age-calculator",
  // Everyday text
  "notes-scratchpad",
  "character-counter",
  "word-counter",
  "case-converter",
  "color-picker",
  // Files and media
  "qr-generator",
  "image-compressor",
  "pdf-converter",
  "audio-recorder",
  // Privacy and security
  "password-generator",
  "password-strength-checker",
  // Sharing and utility
  "vcard-generator",
  "ical-generator",
  "dice-roller",
] as const

describe("tool registry", () => {
  it("has stable unique identifiers", () => {
    const ids = tools.map((tool) => tool.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))).toBe(true)
  })

  it("does not mark a tool enabled without an implementation", () => {
    expect(tools.filter((tool) => tool.status === "enabled").every((tool) => tool.component)).toBe(
      true,
    )
  })

  it("enables the approved version-1 scope and nothing else", () => {
    const enabled = tools.filter((tool) => tool.status === "enabled").map((tool) => tool.id)
    expect([...enabled].sort()).toEqual([...approvedVersionOneScope].sort())
    expect(enabled).toHaveLength(30)
  })

  it("keeps every cut tool in the manifest as a removed entry with no runtime chunk", () => {
    const removed = tools.filter((tool) => tool.status === "removed")
    expect(removed).toHaveLength(70)
    // A removed entry that kept its lazy component would still emit a chunk that never
    // loads, which is exactly the shipped-size cost ADR 0023 exists to remove.
    expect(removed.some((tool) => tool.component)).toBe(false)
    // The entry itself is retained so a reversal is a manifest edit, not a rewrite.
    expect(removed.every((tool) => tool.id && tool.label && tool.description)).toBe(true)
    expect(removed.some((tool) => approvedVersionOneScope.includes(tool.id as never))).toBe(false)
  })

  it("uses only the lifecycle states this release actually ships", () => {
    const states = new Set(tools.map((tool) => tool.status))
    expect([...states].sort()).toEqual(["enabled", "removed"])
  })

  it("labels all network behavior in metadata", () => {
    // Cutting DNS Lookup leaves a single network provider in the released scope, which is
    // what narrows the CSP connect-src allowlist and the Data Safety declarations to one.
    expect(
      tools.filter((tool) => tool.network && tool.status === "enabled").map((tool) => tool.id),
    ).toEqual(["currency-converter"])
    expect(
      tools.filter((tool) => tool.network && tool.status === "removed").map((tool) => tool.id),
    ).toEqual(["dns-lookup"])
  })
})
