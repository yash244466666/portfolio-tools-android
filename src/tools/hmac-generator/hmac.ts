export const hmacAlgorithms = ["SHA-256", "SHA-384", "SHA-512"] as const
export type HmacAlgorithm = (typeof hmacAlgorithms)[number]

export function getHmacAlgorithm(id: string): HmacAlgorithm {
  return hmacAlgorithms.includes(id as HmacAlgorithm) ? (id as HmacAlgorithm) : "SHA-256"
}

function bytesToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

/**
 * Signs `message` with `key` using Web Crypto's HMAC. Runs entirely on the
 * device; the secret never leaves the WebView.
 */
export async function hmacSign(
  algorithm: HmacAlgorithm,
  key: string,
  message: string,
): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto is unavailable on this device.")
  }
  const encoder = new TextEncoder()
  const cryptoKey = await globalThis.crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: algorithm },
    false,
    ["sign"],
  )
  const signature = await globalThis.crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message))
  return bytesToHex(signature)
}

/** The expected output length in hex digits per algorithm (RFC 2104/4231). */
export function expectedHmacHexLength(algorithm: HmacAlgorithm): number {
  switch (algorithm) {
    case "SHA-256":
      return 64
    case "SHA-384":
      return 96
    case "SHA-512":
      return 128
  }
}
