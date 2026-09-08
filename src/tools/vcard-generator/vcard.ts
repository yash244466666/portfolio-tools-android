/**
 * Pure RFC 6350 vCard 3.0 generation. Text properties escape backslash,
 * semicolon, comma, and newlines — the upstream version escaped nothing, so a
 * name like `Smith; Jr` corrupted the N property structure.
 */

export interface VcardInput {
  firstName: string
  lastName: string
  organization: string
  phone: string
  email: string
  url: string
  address: string
}

export type VcardResult =
  { status: "ok"; card: string; filename: string }
  | { status: "error"; message: string }

export function escapeVcardText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\r|\n/g, "\\n")
}

/** Lowercase kebab name for the suggested `.vcf` filename; never empty. */
export function vcardFilename(firstName: string, lastName: string): string {
  const base = `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${base === "" ? "contact" : base}.vcf`
}

export function buildVcard(raw: Partial<VcardInput>): VcardResult {
  const input: VcardInput = {
    firstName: raw.firstName ?? "",
    lastName: raw.lastName ?? "",
    organization: raw.organization ?? "",
    phone: raw.phone ?? "",
    email: raw.email ?? "",
    url: raw.url ?? "",
    address: raw.address ?? "",
  }
  const firstName = input.firstName.trim()
  const lastName = input.lastName.trim()
  if (firstName === "" && lastName === "") {
    return { status: "error", message: "Enter at least a first or last name." }
  }

  const lines: string[] = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcardText(lastName)};${escapeVcardText(firstName)};;;`,
    `FN:${escapeVcardText(`${firstName} ${lastName}`.trim())}`,
  ]
  const organization = input.organization.trim()
  if (organization !== "") lines.push(`ORG:${escapeVcardText(organization)}`)
  const phone = input.phone.trim()
  if (phone !== "") lines.push(`TEL;TYPE=VOICE:${escapeVcardText(phone)}`)
  const email = input.email.trim()
  if (email !== "") lines.push(`EMAIL;TYPE=INTERNET:${escapeVcardText(email)}`)
  const url = input.url.trim()
  if (url !== "") {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return { status: "error", message: "Enter an https website URL." }
    }
    if (parsed.protocol !== "https:") {
      return { status: "error", message: "Enter an https website URL." }
    }
    lines.push(`URL:${escapeVcardText(url)}`)
  }
  const address = input.address.trim()
  if (address !== "") lines.push(`ADR;TYPE=HOME:;;${escapeVcardText(address)};;;;`)
  lines.push("END:VCARD")
  return {
    status: "ok",
    card: lines.join("\r\n"),
    filename: vcardFilename(firstName, lastName),
  }
}