import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Clipboard } from "@capacitor/clipboard"
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { LocalNotifications } from "@capacitor/local-notifications"
import { Network } from "@capacitor/network"
import { Preferences } from "@capacitor/preferences"
import { Share } from "@capacitor/share"
import type { NetworkState, PlatformServices } from "@/platform/contracts"
import { PlatformError } from "@/platform/errors"
import { secureRandomService } from "@/platform/shared/random"

const preferencePrefix = "yash-tools:v1:"

function stableNotificationId(value: string): number {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash || 1)
}

function normalizeConnectionType(type: string): NetworkState["connectionType"] {
  if (type === "wifi" || type === "cellular" || type === "none") return type
  return "unknown"
}

export const capacitorPlatformServices: PlatformServices = {
  kind: "android",
  clipboard: {
    async readText() {
      try {
        return (await Clipboard.read()).value
      } catch (error) {
        throw new PlatformError(
          "CLIPBOARD_READ_FAILED",
          "Clipboard access failed. Paste into the field instead.",
          true,
          error,
        )
      }
    },
    async writeText(value, options) {
      try {
        await Clipboard.write({ string: value })
        if (options?.clearAfterMs) {
          window.setTimeout(
            () => void Clipboard.write({ string: "" }).catch(() => undefined),
            options.clearAfterMs,
          )
        }
      } catch (error) {
        throw new PlatformError(
          "CLIPBOARD_WRITE_FAILED",
          "The result could not be copied.",
          true,
          error,
        )
      }
    },
  },
  preferences: {
    async get<T>(key: string) {
      try {
        const { value } = await Preferences.get({ key: `${preferencePrefix}${key}` })
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
        await Preferences.set({ key: `${preferencePrefix}${key}`, value: JSON.stringify(value) })
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
      await Preferences.remove({ key: `${preferencePrefix}${key}` })
    },
    async clear() {
      const { keys } = await Preferences.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith(preferencePrefix))
          .map((key) => Preferences.remove({ key })),
      )
    },
  },
  files: {
    async pick() {
      throw new PlatformError(
        "FILE_PICK_UNAVAILABLE",
        "Android document picking is scheduled for the file-adapter milestone.",
      )
    },
    async share(file) {
      try {
        const saved = await Filesystem.writeFile({
          path: `share/${file.name}`,
          data: file.data,
          directory: Directory.Cache,
          encoding: file.encoding === "utf8" ? Encoding.UTF8 : undefined,
          recursive: true,
        })
        await Share.share({ title: file.name, files: [saved.uri] })
      } catch (error) {
        throw new PlatformError("FILE_SHARE_FAILED", "The file could not be shared.", true, error)
      }
    },
    async saveAs() {
      throw new PlatformError(
        "FILE_SAVE_UNAVAILABLE",
        "Save As will be enabled after the Android document-create adapter is complete.",
      )
    },
  },
  notifications: {
    async requestPermission() {
      const current = await LocalNotifications.checkPermissions()
      const result =
        current.display === "prompt" ? await LocalNotifications.requestPermissions() : current
      return {
        granted: result.display === "granted",
        canAskAgain: result.display === "prompt" || result.display === "prompt-with-rationale",
      }
    },
    async schedule(notification) {
      try {
        await LocalNotifications.schedule({
          notifications: [
            {
              id: stableNotificationId(notification.id),
              title: notification.title,
              body: notification.body,
              schedule: { at: notification.at, allowWhileIdle: false },
              channelId: notification.channelId,
            },
          ],
        })
      } catch (error) {
        throw new PlatformError(
          "NOTIFICATION_SCHEDULE_FAILED",
          "The notification could not be scheduled.",
          true,
          error,
        )
      }
    },
    async cancel(id) {
      await LocalNotifications.cancel({ notifications: [{ id: stableNotificationId(id) }] })
    },
  },
  network: {
    async current() {
      const state = await Network.getStatus()
      return {
        connected: state.connected,
        connectionType: normalizeConnectionType(state.connectionType),
      }
    },
    async subscribe(listener) {
      const handle = await Network.addListener("networkStatusChange", (state) => {
        listener({
          connected: state.connected,
          connectionType: normalizeConnectionType(state.connectionType),
        })
      })
      return () => handle.remove()
    },
  },
  browser: {
    async open(url) {
      if (url.protocol !== "https:") {
        throw new PlatformError("EXTERNAL_URL_REJECTED", "Only secure web links are allowed.")
      }
      try {
        await Browser.open({ url: url.toString(), presentationStyle: "popover" })
      } catch (error) {
        throw new PlatformError(
          "EXTERNAL_URL_OPEN_FAILED",
          "The browser could not open this link.",
          true,
          error,
        )
      }
    },
  },
  random: secureRandomService,
  lifecycle: {
    current() {
      return { active: document.visibilityState === "visible" }
    },
    async subscribe(listener) {
      const handle = await App.addListener("appStateChange", ({ isActive }) =>
        listener({ active: isActive }),
      )
      return () => handle.remove()
    },
  },
  haptics: {
    async confirm() {
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
    },
  },
}
