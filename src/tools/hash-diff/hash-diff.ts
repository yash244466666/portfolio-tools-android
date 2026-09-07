/**
 * Pure hash computation for comparing two texts by digest.
 *
 * Uses the platform Web Crypto engine directly. SHA-1 is offered for
 * interoperation with legacy checksum lists and is labeled as legacy; SHA-256
 * and SHA-512 are the recommended comparisons.
 */

export const hashDiffAlgorithms = ["SHA-1", "SHA-256", "SHA-512"] as const

export type HashDiffAlgorithm = (typeof hashDiffAlgorithms)[number]

/** Source text bound, matching the other text tools' textarea limits. */
export const maximumSourceLength = 10_000

export const hashDiffAlgorithmLabels: Record<HashDiffAlgorithm, string> = {
  "SHA-1": "SHA-1 (legacy)",
  "SHA-256": "SHA-256",
  "SHA-512": "SHA-512",
}

export interface HashDiffEntry {
  algorithm: HashDiffAlgorithm
  label: string
  first: string
  second: string
  match: boolean
}

export interface HashDiffResult {
  entries: HashDiffEntry[]
  identical: boolean
}

/** Hex-encodes a digest; empty for a rejected algorithm. */
export function toHexDigest(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

/** Expected hex length per algorithm, used to validate output completeness. */
export function expectedHashHexLength(algorithm: HashDiffAlgorithm): number {
  switch (algorithm) {
    case "SHA-1":
      return 40
    case "SHA-256":
      return 64
    case "SHA-512":
      return 128
  }
}

/**
 * Computes the digest of one text under one algorithm. Digests are computed over
 * the UTF-8 encoding of the text.
 */
export async function computeHashDiffHash(
  algorithm: HashDiffAlgorithm,
  text: string,
): Promise<string> {
  if (!hashDiffAlgorithms.includes(algorithm)) {
    throw new Error(`Unsupported hash algorithm: ${String(algorithm)}`)
  }
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    throw new Error("Web Crypto is unavailable on this device.")
  }
  const bytes = new TextEncoder().encode(text)
  const digest = await subtle.digest(algorithm, bytes)
  return toHexDigest(digest)
}

/** Compares full digests; different lengths are always a difference. */
export function compareHashes(first: string, second: string): boolean {
  return first === second
}

/** Builds the per-algorithm result rows from two digest maps. */
export function buildHashDiffResult(
  firstDigests: Map<HashDiffAlgorithm, string>,
  secondDigests: Map<HashDiffAlgorithm, string>,
): HashDiffResult {
  const entries = hashDiffAlgorithms.map((algorithm) => {
    const first = firstDigests.get(algorithm) ?? ""
    const second = secondDigests.get(algorithm) ?? ""
    return {
      algorithm,
      label: hashDiffAlgorithmLabels[algorithm],
      first,
      second,
      match: compareHashes(first, second),
    }
  })
  return { entries, identical: entries.every((entry) => entry.match) }
}
