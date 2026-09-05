import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { NetworkState, PlatformServices, Unsubscribe } from "@/platform/contracts"
import type { PlatformError } from "@/platform/errors"

type ListenerHandle = { remove: () => Promise<void> }
type NativeNetworkListener = (state: { connected: boolean; connectionType: string }) => void
type NativeLifecycleListener = (state: { isActive: boolean }) => void

const pluginMocks = vi.hoisted(() => ({
  appAddListener:
    vi.fn<(eventName: string, listener: NativeLifecycleListener) => Promise<ListenerHandle>>(),
  browserOpen: vi.fn<(options: { url: string; presentationStyle: string }) => Promise<void>>(),
  clipboardRead: vi.fn<() => Promise<{ value: string }>>(),
  clipboardWrite: vi.fn<(options: { string: string }) => Promise<void>>(),
  filesystemWriteFile:
    vi.fn<
      (options: {
        path: string
        data: string
        directory: string
        encoding?: string
        recursive: boolean
      }) => Promise<{ uri: string }>
    >(),
  hapticsImpact: vi.fn<(options: { style: string }) => Promise<void>>(),
  notificationsCancel: vi.fn<(options: unknown) => Promise<void>>(),
  notificationsCheckPermissions: vi.fn<() => Promise<{ display: string }>>(),
  notificationsRequestPermissions: vi.fn<() => Promise<{ display: string }>>(),
  notificationsSchedule: vi.fn<(options: unknown) => Promise<void>>(),
  networkAddListener:
    vi.fn<(eventName: string, listener: NativeNetworkListener) => Promise<ListenerHandle>>(),
  networkGetStatus: vi.fn<() => Promise<{ connected: boolean; connectionType: string }>>(),
  preferencesGet: vi.fn<(options: { key: string }) => Promise<{ value: string | null }>>(),
  preferencesKeys: vi.fn<() => Promise<{ keys: string[] }>>(),
  preferencesRemove: vi.fn<(options: { key: string }) => Promise<void>>(),
  preferencesSet: vi.fn<(options: { key: string; value: string }) => Promise<void>>(),
  share: vi.fn<(options: { title: string; files: string[] }) => Promise<void>>(),
}))

vi.mock("@capacitor/app", () => ({ App: { addListener: pluginMocks.appAddListener } }))
vi.mock("@capacitor/browser", () => ({ Browser: { open: pluginMocks.browserOpen } }))
vi.mock("@capacitor/clipboard", () => ({
  Clipboard: { read: pluginMocks.clipboardRead, write: pluginMocks.clipboardWrite },
}))
vi.mock("@capacitor/filesystem", () => ({
  Directory: { Cache: "CACHE" },
  Encoding: { UTF8: "utf8" },
  Filesystem: { writeFile: pluginMocks.filesystemWriteFile },
}))
vi.mock("@capacitor/haptics", () => ({
  Haptics: { impact: pluginMocks.hapticsImpact },
  ImpactStyle: { Light: "LIGHT" },
}))
vi.mock("@capacitor/local-notifications", () => ({
  LocalNotifications: {
    cancel: pluginMocks.notificationsCancel,
    checkPermissions: pluginMocks.notificationsCheckPermissions,
    requestPermissions: pluginMocks.notificationsRequestPermissions,
    schedule: pluginMocks.notificationsSchedule,
  },
}))
vi.mock("@capacitor/network", () => ({
  Network: {
    addListener: pluginMocks.networkAddListener,
    getStatus: pluginMocks.networkGetStatus,
  },
}))
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: pluginMocks.preferencesGet,
    keys: pluginMocks.preferencesKeys,
    remove: pluginMocks.preferencesRemove,
    set: pluginMocks.preferencesSet,
  },
}))
vi.mock("@capacitor/share", () => ({ Share: { share: pluginMocks.share } }))

import { capacitorPlatformServices } from "@/platform/capacitor/services"
import { webPlatformServices } from "@/platform/web/services"

const preferencePrefix = "yash-tools:v1:"

interface AdapterHarness {
  services: PlatformServices
  setClipboard(value: string): void
  getClipboard(): string
  setRawPreference(key: string, value: string): void
  getRawPreference(key: string): string | null
  setConnected(connected: boolean): void
  emitNetwork(connected: boolean): void
  emitLifecycle(active: boolean): void
  hapticCalls(): number
  openedUrls(): string[]
}

let webClipboard = ""
let webConnected = true
let webLifecycleActive = true
let openedWebUrls: string[] = []
let webShareMock: ReturnType<typeof vi.fn<(data?: ShareData) => Promise<void>>>
let webVibrateMock: ReturnType<typeof vi.fn<(pattern: number) => boolean>>

const nativePreferences = new Map<string, string>()
let nativeClipboard = ""
let nativeNetworkState = { connected: true, connectionType: "wifi" }
let nativeNetworkListener: NativeNetworkListener | undefined
let nativeLifecycleListener: NativeLifecycleListener | undefined

function configureWebMocks() {
  webClipboard = ""
  webConnected = true
  webLifecycleActive = true
  openedWebUrls = []
  const clipboard = {
    readText: vi.fn(async () => webClipboard),
    writeText: vi.fn(async (value: string) => {
      webClipboard = value
    }),
  }
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: clipboard })
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    get: () => webConnected,
  })
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (webLifecycleActive ? "visible" : "hidden"),
  })
  webVibrateMock = vi.fn<(pattern: number) => boolean>(() => true)
  Object.defineProperty(navigator, "vibrate", { configurable: true, value: webVibrateMock })
  webShareMock = vi.fn<(data?: ShareData) => Promise<void>>(async () => undefined)
  Object.defineProperty(navigator, "share", { configurable: true, value: webShareMock })
  Object.defineProperty(navigator, "canShare", {
    configurable: true,
    value: vi.fn(() => true),
  })
  vi.spyOn(window, "open").mockImplementation((url) => {
    openedWebUrls.push(String(url))
    return window
  })
}

function configureNativeMocks() {
  nativePreferences.clear()
  nativeClipboard = ""
  nativeNetworkState = { connected: true, connectionType: "wifi" }
  nativeNetworkListener = undefined
  nativeLifecycleListener = undefined

  pluginMocks.clipboardRead.mockImplementation(async () => ({ value: nativeClipboard }))
  pluginMocks.clipboardWrite.mockImplementation(async ({ string }) => {
    nativeClipboard = string
  })
  pluginMocks.preferencesGet.mockImplementation(async ({ key }) => ({
    value: nativePreferences.get(key) ?? null,
  }))
  pluginMocks.preferencesSet.mockImplementation(async ({ key, value }) => {
    nativePreferences.set(key, value)
  })
  pluginMocks.preferencesRemove.mockImplementation(async ({ key }) => {
    nativePreferences.delete(key)
  })
  pluginMocks.preferencesKeys.mockImplementation(async () => ({
    keys: [...nativePreferences.keys()],
  }))
  pluginMocks.networkGetStatus.mockImplementation(async () => nativeNetworkState)
  pluginMocks.networkAddListener.mockImplementation(async (_eventName, listener) => {
    nativeNetworkListener = listener
    return {
      remove: async () => {
        nativeNetworkListener = undefined
      },
    }
  })
  pluginMocks.appAddListener.mockImplementation(async (_eventName, listener) => {
    nativeLifecycleListener = listener
    return {
      remove: async () => {
        nativeLifecycleListener = undefined
      },
    }
  })
  pluginMocks.browserOpen.mockResolvedValue(undefined)
  pluginMocks.filesystemWriteFile.mockResolvedValue({ uri: "file:///cache/share/output.txt" })
  pluginMocks.hapticsImpact.mockResolvedValue(undefined)
  pluginMocks.notificationsCancel.mockResolvedValue(undefined)
  pluginMocks.notificationsCheckPermissions.mockResolvedValue({ display: "granted" })
  pluginMocks.notificationsRequestPermissions.mockResolvedValue({ display: "granted" })
  pluginMocks.notificationsSchedule.mockResolvedValue(undefined)
  pluginMocks.share.mockResolvedValue(undefined)
}

function webHarness(): AdapterHarness {
  return {
    services: webPlatformServices,
    setClipboard(value) {
      webClipboard = value
    },
    getClipboard: () => webClipboard,
    setRawPreference: (key, value) => localStorage.setItem(key, value),
    getRawPreference: (key) => localStorage.getItem(key),
    setConnected(connected) {
      webConnected = connected
    },
    emitNetwork(connected) {
      webConnected = connected
      window.dispatchEvent(new Event(connected ? "online" : "offline"))
    },
    emitLifecycle(active) {
      webLifecycleActive = active
      document.dispatchEvent(new Event("visibilitychange"))
    },
    hapticCalls: () => webVibrateMock.mock.calls.length,
    openedUrls: () => openedWebUrls,
  }
}

function nativeHarness(): AdapterHarness {
  return {
    services: capacitorPlatformServices,
    setClipboard(value) {
      nativeClipboard = value
    },
    getClipboard: () => nativeClipboard,
    setRawPreference: (key, value) => nativePreferences.set(key, value),
    getRawPreference: (key) => nativePreferences.get(key) ?? null,
    setConnected(connected) {
      nativeNetworkState = { connected, connectionType: connected ? "wifi" : "none" }
    },
    emitNetwork(connected) {
      nativeNetworkListener?.({ connected, connectionType: connected ? "wifi" : "none" })
    },
    emitLifecycle(active) {
      webLifecycleActive = active
      nativeLifecycleListener?.({ isActive: active })
    },
    hapticCalls: () => pluginMocks.hapticsImpact.mock.calls.length,
    openedUrls: () => pluginMocks.browserOpen.mock.calls.map(([options]) => String(options.url)),
  }
}

function expectPlatformError(code: PlatformError["code"]): unknown {
  return expect.objectContaining<Partial<PlatformError>>({ code })
}

function runSharedAdapterContract(name: string, createHarness: () => AdapterHarness) {
  describe(`${name} platform adapter contract`, () => {
    let harness: AdapterHarness

    beforeEach(() => {
      harness = createHarness()
    })

    it("round-trips explicit clipboard reads and writes", async () => {
      await harness.services.clipboard.writeText("copied value")
      await expect(harness.services.clipboard.readText()).resolves.toBe("copied value")
    })

    it("does not erase clipboard content copied by the user after a timed write", async () => {
      vi.useFakeTimers()
      await harness.services.clipboard.writeText("temporary", { clearAfterMs: 1_000 })
      harness.setClipboard("newer value")

      await vi.advanceTimersByTimeAsync(1_000)

      expect(harness.getClipboard()).toBe("newer value")
    })

    it("clears an unchanged clipboard value after the requested delay", async () => {
      vi.useFakeTimers()
      await harness.services.clipboard.writeText("temporary", { clearAfterMs: 1_000 })

      await vi.advanceTimersByTimeAsync(1_000)

      expect(harness.getClipboard()).toBe("")
    })

    it("round-trips namespaced JSON preferences and preserves unrelated storage", async () => {
      harness.setRawPreference("unrelated", "keep")
      await harness.services.preferences.set("sample", { enabled: true })
      await expect(harness.services.preferences.get("sample")).resolves.toEqual({ enabled: true })

      await harness.services.preferences.clear()

      await expect(harness.services.preferences.get("sample")).resolves.toBeNull()
      expect(harness.getRawPreference("unrelated")).toBe("keep")
    })

    it("maps corrupt stored JSON to the stable data-read error", async () => {
      harness.setRawPreference(`${preferencePrefix}broken`, "{")
      await expect(harness.services.preferences.get("broken")).rejects.toEqual(
        expectPlatformError("DATA_READ_FAILED"),
      )
    })

    it("rejects unsafe external URLs and opens HTTPS outside the app", async () => {
      await expect(harness.services.browser.open(new URL("http://example.com"))).rejects.toEqual(
        expectPlatformError("EXTERNAL_URL_REJECTED"),
      )
      await expect(
        harness.services.browser.open(new URL("https://user:secret@example.com")),
      ).rejects.toEqual(expectPlatformError("EXTERNAL_URL_REJECTED"))

      await harness.services.browser.open(new URL("https://example.com/help"))

      expect(harness.openedUrls()).toEqual(["https://example.com/help"])
    })

    it("reports current network state and removes subscriptions", async () => {
      harness.setConnected(false)
      await expect(harness.services.network.current()).resolves.toEqual({
        connected: false,
        connectionType: "none",
      })
      const listener = vi.fn<(state: NetworkState) => void>()
      const unsubscribe: Unsubscribe = await harness.services.network.subscribe(listener)

      harness.emitNetwork(true)
      expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ connected: true }))
      expect(listener.mock.calls.at(-1)?.[0]?.connectionType).toMatch(/^(wifi|unknown)$/)
      await unsubscribe()
      harness.emitNetwork(false)
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it("reports lifecycle changes, removes listeners, and treats haptics as optional", async () => {
      expect(harness.services.lifecycle.current().active).toBe(true)
      const listener = vi.fn<(state: { active: boolean }) => void>()
      const unsubscribe = await harness.services.lifecycle.subscribe(listener)

      harness.emitLifecycle(false)
      expect(listener).toHaveBeenLastCalledWith({ active: false })
      await unsubscribe()
      harness.emitLifecycle(true)
      expect(listener).toHaveBeenCalledTimes(1)

      await expect(harness.services.haptics.confirm()).resolves.toBeUndefined()
      expect(harness.hapticCalls()).toBe(1)
    })

    it("provides bounded secure random bytes and RFC 4122 version-4 UUIDs", () => {
      expect(harness.services.random.bytes(16)).toHaveLength(16)
      expect(harness.services.random.uuid()).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      )
      expect(() => harness.services.random.bytes(0)).toThrow(RangeError)
    })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  configureWebMocks()
  configureNativeMocks()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

runSharedAdapterContract("web", webHarness)
runSharedAdapterContract("Capacitor", nativeHarness)

describe("web-specific adapter behavior", () => {
  it("shares decoded Base64 bytes with a sanitized display name", async () => {
    await webPlatformServices.files.share({
      name: "../pixel.bin",
      mimeType: "application/octet-stream",
      data: "AP+A",
      encoding: "base64",
    })

    const shareData = webShareMock.mock.calls[0]?.[0]
    const sharedFile = shareData?.files?.[0]
    expect(sharedFile?.name).toBe("-pixel.bin")
    await expect(readBlobBytes(sharedFile)).resolves.toEqual([0, 255, 128])
  })

  it("maps a blocked external window to the stable open-failure error", async () => {
    vi.spyOn(window, "open").mockReturnValue(null)

    await expect(webPlatformServices.browser.open(new URL("https://example.com"))).rejects.toEqual(
      expectPlatformError("EXTERNAL_URL_OPEN_FAILED"),
    )
  })

  it("maps a dismissed share sheet to cancellation", async () => {
    webShareMock.mockRejectedValue(new DOMException("dismissed", "AbortError"))

    await expect(
      webPlatformServices.files.share({
        name: "output.txt",
        mimeType: "text/plain",
        data: "safe fixture",
        encoding: "utf8",
      }),
    ).rejects.toEqual(expectPlatformError("FILE_SHARE_CANCELLED"))
  })
})

describe("Capacitor-specific adapter behavior", () => {
  it("keeps picker and Save As unavailable with stable typed errors", async () => {
    await expect(capacitorPlatformServices.files.pick({ accept: ["text/plain"] })).rejects.toEqual(
      expectPlatformError("FILE_PICK_UNAVAILABLE"),
    )
    await expect(
      capacitorPlatformServices.files.saveAs({
        name: "output.txt",
        mimeType: "text/plain",
        data: "safe fixture",
        encoding: "utf8",
      }),
    ).rejects.toEqual(expectPlatformError("FILE_SAVE_UNAVAILABLE"))
  })

  it("writes shares only below the narrow cache directory with a sanitized name", async () => {
    await capacitorPlatformServices.files.share({
      name: "../private\\output.txt",
      mimeType: "text/plain",
      data: "safe fixture",
      encoding: "utf8",
    })

    expect(pluginMocks.filesystemWriteFile).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "share/-private-output.txt",
        directory: "CACHE",
        encoding: "utf8",
      }),
    )
    expect(pluginMocks.share).toHaveBeenCalledWith({
      title: "-private-output.txt",
      files: ["file:///cache/share/output.txt"],
    })
  })

  it("uses deterministic notification IDs without exact-alarm behavior", async () => {
    const notification = {
      id: "pomodoro-active",
      title: "Timer complete",
      body: "Your timer has finished.",
      at: new Date("2030-01-01T00:00:00Z"),
      channelId: "timers" as const,
    }

    await capacitorPlatformServices.notifications.schedule(notification)
    await capacitorPlatformServices.notifications.cancel(notification.id)

    const scheduled = pluginMocks.notificationsSchedule.mock.calls[0]?.[0] as {
      notifications?: Array<{ id: number; schedule: { allowWhileIdle: boolean } }>
    }
    const scheduledId = scheduled.notifications?.[0]?.id
    expect(scheduled.notifications?.[0]?.schedule.allowWhileIdle).toBe(false)
    expect(pluginMocks.notificationsCancel).toHaveBeenCalledWith({
      notifications: [{ id: scheduledId }],
    })
  })
})

async function readBlobBytes(blob: Blob | undefined): Promise<number[]> {
  if (!blob) return []
  return await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error("Fixture blob could not be read."))
    reader.onload = () => resolve(Array.from(new Uint8Array(reader.result as ArrayBuffer)))
    reader.readAsArrayBuffer(blob)
  })
}
