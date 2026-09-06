import type {
  FilePickOptions,
  GeneratedFile,
  NetworkState,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import { isCancellationError, PlatformError } from "@/platform/errors"
import { generatedFileBytes, sanitizeGeneratedFileName } from "@/platform/shared/files"
import { secureRandomService } from "@/platform/shared/random"
import { validatedExternalUrl } from "@/platform/shared/urls"

const preferencePrefix = "yash-tools:v1:"
const maximumClipboardBytes = 1024 * 1024

async function pickFromBrowser(options: FilePickOptions) {
  return new Promise<PickedFile[]>((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = options.accept.join(",")
    input.multiple = options.multiple ?? false
    input.onchange = () => {
      const files = Array.from(input.files ?? [])
      if (files.length === 0) {
        reject(new PlatformError("FILE_PICK_CANCELLED", "No file selected."))
        return
      }
      const tooLarge = files.find((file) =>
        options.maximumBytes ? file.size > options.maximumBytes : false,
      )
      if (tooLarge) {
        reject(
          new PlatformError("FILE_TOO_LARGE", `${tooLarge.name} is larger than this tool allows.`),
        )
        return
      }
      resolve(
        files.map((file) => ({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          file,
        })),
      )
    }
    input.oncancel = () => reject(new PlatformError("FILE_PICK_CANCELLED", "No file selected."))
    input.click()
  })
}

function browserDownload(file: GeneratedFile) {
  const blob = new Blob([generatedFileBytes(file)], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = sanitizeGeneratedFileName(file.name)
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

function browserNetworkState(): NetworkState {
  return {
    connected: navigator.onLine,
    connectionType: navigator.onLine ? "unknown" : "none",
  }
}

export const webPlatformServices: PlatformServices = {
  kind: "web",
  clipboard: {
    async readText() {
      try {
        return await navigator.clipboard.readText()
      } catch (error) {
        throw new PlatformError(
          "CLIPBOARD_READ_FAILED",
          "Clipboard access was blocked. Paste into the field instead.",
          true,
          error,
        )
      }
    },
    async writeText(value, options) {
      // The Web Clipboard API cannot mark values as sensitive, so the flag degrades to a no-op
      // here; the Android adapter applies the sensitive-clipboard metadata instead.
      if (new TextEncoder().encode(value).byteLength > maximumClipboardBytes) {
        throw new PlatformError(
          "CLIPBOARD_INVALID_ARGUMENT",
          "The copied value exceeds the clipboard size limit.",
        )
      }
      try {
        await navigator.clipboard.writeText(value)
        if (options?.clearAfterMs) {
          window.setTimeout(() => {
            void navigator.clipboard
              .readText()
              .then((current) =>
                current === value ? navigator.clipboard.writeText("") : Promise.resolve(),
              )
              .catch(() => undefined)
          }, options.clearAfterMs)
        }
      } catch (error) {
        throw new PlatformError(
          "CLIPBOARD_WRITE_FAILED",
          "Copy was blocked. Select and copy the result manually.",
          true,
          error,
        )
      }
    },
  },
  preferences: {
    async get<T>(key: string) {
      try {
        const value = localStorage.getItem(`${preferencePrefix}${key}`)
        return value === null ? null : (JSON.parse(value) as T)
      } catch (error) {
        throw new PlatformError(
          "DATA_READ_FAILED",
          "Saved settings could not be read.",
          true,
          error,
        )
      }
    },
    async set<T>(key: string, value: T) {
      try {
        localStorage.setItem(`${preferencePrefix}${key}`, JSON.stringify(value))
      } catch (error) {
        throw new PlatformError(
          "DATA_WRITE_FAILED",
          "This setting could not be saved.",
          true,
          error,
        )
      }
    },
    async remove(key) {
      try {
        localStorage.removeItem(`${preferencePrefix}${key}`)
      } catch (error) {
        throw new PlatformError(
          "DATA_WRITE_FAILED",
          "This saved setting could not be removed.",
          true,
          error,
        )
      }
    },
    async clear() {
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(preferencePrefix))
          .forEach((key) => localStorage.removeItem(key))
      } catch (error) {
        throw new PlatformError(
          "DATA_WRITE_FAILED",
          "Saved app preferences could not be cleared.",
          true,
          error,
        )
      }
    },
  },
  files: {
    pick: pickFromBrowser,
    async share(file) {
      const safeName = sanitizeGeneratedFileName(file.name)
      try {
        if (navigator.share && navigator.canShare) {
          const blob = new Blob([generatedFileBytes(file)], { type: file.mimeType })
          const shareFile = new File([blob], safeName, { type: file.mimeType })
          if (navigator.canShare({ files: [shareFile] })) {
            await navigator.share({ files: [shareFile], title: safeName })
            return
          }
        }
        browserDownload({ ...file, name: safeName })
      } catch (error) {
        if (isCancellationError(error)) {
          throw new PlatformError("FILE_SHARE_CANCELLED", "Sharing was cancelled.", true, error)
        }
        throw new PlatformError("FILE_SHARE_FAILED", "The file could not be shared.", true, error)
      }
    },
    async saveAs(file) {
      try {
        browserDownload(file)
      } catch (error) {
        throw new PlatformError("FILE_SAVE_FAILED", "The file could not be saved.", true, error)
      }
    },
  },
  notifications: {
    async requestPermission() {
      if (!("Notification" in window)) return { granted: false, canAskAgain: false }
      const permission = await Notification.requestPermission()
      return { granted: permission === "granted", canAskAgain: permission === "default" }
    },
    async schedule() {
      throw new PlatformError(
        "NOTIFICATION_SCHEDULE_FAILED",
        "Scheduled notifications are available in the Android application.",
      )
    },
    async cancel() {
      return Promise.resolve()
    },
  },
  network: {
    async current() {
      return browserNetworkState()
    },
    async subscribe(listener) {
      const handle = () => listener(browserNetworkState())
      window.addEventListener("online", handle)
      window.addEventListener("offline", handle)
      return () => {
        window.removeEventListener("online", handle)
        window.removeEventListener("offline", handle)
      }
    },
  },
  browser: {
    async open(url) {
      const opened = window.open(validatedExternalUrl(url), "_blank", "noopener,noreferrer")
      if (!opened) {
        throw new PlatformError("EXTERNAL_URL_OPEN_FAILED", "The browser could not open this link.")
      }
    },
  },
  random: secureRandomService,
  lifecycle: {
    current() {
      return { active: document.visibilityState === "visible" }
    },
    async subscribe(listener) {
      const handle = () => listener({ active: document.visibilityState === "visible" })
      document.addEventListener("visibilitychange", handle)
      return () => document.removeEventListener("visibilitychange", handle)
    },
  },
  haptics: {
    async confirm() {
      navigator.vibrate?.(12)
    },
  },
}
