export const hashAlgorithms = ["SHA-1", "SHA-256", "SHA-512"] as const
export type HashAlgorithm = (typeof hashAlgorithms)[number]

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function hashText(algorithm: HashAlgorithm, value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto is unavailable on this device.")
  const input = new TextEncoder().encode(value)
  return bytesToHex(await globalThis.crypto.subtle.digest(algorithm, input))
}

export async function hashTextAll(value: string): Promise<Record<HashAlgorithm, string>> {
  const entries = await Promise.all(
    hashAlgorithms.map(async (algorithm) => [algorithm, await hashText(algorithm, value)] as const),
  )
  return Object.fromEntries(entries) as Record<HashAlgorithm, string>
}
