import type {
  FilePickOptions,
  GeneratedFile,
  NetworkState,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import { secureRandomService } from "@/platform/shared/random"

const preferencePrefix = "yash-tools:v1:"

async function pickFromBrowser(options: FilePickOptions) {
  return new Promise<PickedFile[]>((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = options.accept.join(",")
    input.multiple = options.multiple ?? false
    input.onchange = () => {
      const files = Array.from(input.files ?? [])
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
  const bytes =
    file.encoding === "base64"
      ? Uint8Array.from(atob(file.data), (character) => character.charCodeAt(0))
      : file.data
  const blob = new Blob([bytes], { type: file.mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = file.name
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
      try {
        await navigator.clipboard.writeText(value)
        if (options?.clearAfterMs) {
          window.setTimeout(() => {
            void navigator.clipboard.writeText("").catch(() => undefined)
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
      localStorage.removeItem(`${preferencePrefix}${key}`)
    },
    async clear() {
      Object.keys(localStorage)
        .filter((key) => key.startsWith(preferencePrefix))
        .forEach((key) => localStorage.removeItem(key))
    },
  },
  files: {
    pick: pickFromBrowser,
    async share(file) {
      if (navigator.share && navigator.canShare) {
        const blob = new Blob([file.data], { type: file.mimeType })
        const shareFile = new File([blob], file.name, { type: file.mimeType })
        if (navigator.canShare({ files: [shareFile] })) {
          await navigator.share({ files: [shareFile], title: file.name })
          return
        }
      }
      browserDownload(file)
    },
    async saveAs(file) {
      browserDownload(file)
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
      if (url.protocol !== "https:") {
        throw new PlatformError("EXTERNAL_URL_REJECTED", "Only secure web links are allowed.")
      }
      window.open(url.toString(), "_blank", "noopener,noreferrer")
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
