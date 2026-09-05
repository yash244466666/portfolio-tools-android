import { PlatformError } from "@/platform/errors"

export function validatedExternalUrl(url: URL): string {
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname) {
    throw new PlatformError(
      "EXTERNAL_URL_REJECTED",
      "Only secure web links without embedded credentials are allowed.",
    )
  }
  return url.toString()
}
