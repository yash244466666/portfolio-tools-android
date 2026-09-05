import type { RandomService } from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"

function cryptoSource(): Crypto {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.getRandomValues) {
    throw new PlatformError(
      "RANDOM_UNAVAILABLE",
      "Secure random generation is unavailable on this device.",
      false,
    )
  }
  return globalThis.crypto
}

export const secureRandomService: RandomService = {
  bytes(length) {
    if (!Number.isSafeInteger(length) || length < 1 || length > 65_536) {
      throw new RangeError("Random byte length must be between 1 and 65,536.")
    }
    return cryptoSource().getRandomValues(new Uint8Array(length))
  },

  uuid() {
    const crypto = cryptoSource()
    if (typeof crypto.randomUUID === "function") return crypto.randomUUID()

    const bytes = crypto.getRandomValues(new Uint8Array(16))
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`
  },
}
