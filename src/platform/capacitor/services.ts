import { App } from "@capacitor/app"
import { Browser } from "@capacitor/browser"
import { Clipboard } from "@capacitor/clipboard"
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem"
import { Haptics, ImpactStyle } from "@capacitor/haptics"
import { LocalNotifications } from "@capacitor/local-notifications"
import { Network } from "@capacitor/network"
import { Preferences } from "@capacitor/preferences"
import { Share } from "@capacitor/share"
import {
  DocumentFiles,
  documentFilesContractVersion,
  type NativePickedDocument,
  type SaveDocumentOptions,
} from "@/platform/capacitor/document-files"
import {
  SensitiveClipboard,
  sensitiveClipboardContractVersion,
} from "@/platform/capacitor/sensitive-clipboard"
import { GeneratedCache, generatedCacheContractVersion } from "@/platform/capacitor/generated-cache"
import { capacitorSensorService } from "@/platform/capacitor/phone-sensors"
import { capacitorConnectionService } from "@/platform/capacitor/network-diagnostics"
import type {
  ContentDigestAlgorithm,
  FilePickOptions,
  NetworkState,
  PickedFile,
  PlatformServices,
} from "@/platform/contracts"
import { PlatformError, type PlatformErrorCode } from "@/platform/errors"
import { sanitizeGeneratedFileName, validatedGeneratedFileBytes } from "@/platform/shared/files"
import { createMicrophoneRecorderService } from "@/platform/shared/microphone-recorder"
import { secureRandomService } from "@/platform/shared/random"
import { validatedExternalUrl } from "@/platform/shared/urls"

const preferencePrefix = "yash-tools:v1:"
const saveCacheDirectory = "save"
const maximumPickerBytes = 100 * 1024 * 1024

const nativeFileErrorMessages: Partial<Record<PlatformErrorCode, string>> = {
  FILE_INVALID_ARGUMENT: "The file request was invalid.",
  FILE_OPERATION_IN_PROGRESS: "Finish or cancel the current file request first.",
  FILE_OPERATION_INTERRUPTED: "The file request was interrupted. Please try again.",
  FILE_PICK_CANCELLED: "No file selected.",
  FILE_PICK_FAILED: "The selected document could not be opened.",
  FILE_SAVE_CANCELLED: "Save cancelled.",
  FILE_SAVE_FAILED: "The document could not be saved.",
  FILE_TOO_LARGE: "The document exceeds the allowed size.",
  FILE_READ_FAILED: "The selected document could not be read.",
  FILE_READ_CANCELLED: "The operation was cancelled.",
}

function nativeRejectionCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === "string" ? code : undefined
}

function nativeErrorCode(error: unknown): PlatformErrorCode | undefined {
  const code = nativeRejectionCode(error)
  return typeof code === "string" &&
    Object.prototype.hasOwnProperty.call(nativeFileErrorMessages, code)
    ? (code as PlatformErrorCode)
    : undefined
}

function mappedNativeFileError(
  error: unknown,
  fallbackCode: "FILE_PICK_FAILED" | "FILE_SAVE_FAILED" | "FILE_READ_FAILED",
): PlatformError {
  if (error instanceof PlatformError) return error
  const code = nativeErrorCode(error) ?? fallbackCode
  return new PlatformError(code, nativeFileErrorMessages[code] ?? "The file request failed.")
}

function isValidMimeType(value: string, allowWildcard: boolean): boolean {
  const [type, subtype, ...extra] = value.split("/")
  if (!type || !subtype || extra.length > 0) return false
  const token = /^[a-z0-9][a-z0-9!#$&^_.+-]*$/i
  if (type === "*" || subtype === "*") {
    return allowWildcard && subtype === "*" && (type === "*" || token.test(type))
  }
  return token.test(type) && token.test(subtype)
}

function validatedPickOptions(
  options: FilePickOptions,
): Required<Pick<FilePickOptions, "accept">> & Omit<FilePickOptions, "accept"> {
  const accept = [...new Set(options.accept.map((value) => value.trim().toLowerCase()))]
  if (
    accept.length === 0 ||
    accept.length > 32 ||
    accept.some((value) => !isValidMimeType(value, true))
  ) {
    throw new PlatformError("FILE_INVALID_ARGUMENT", "Choose one or more valid MIME types.")
  }
  if (
    options.maximumBytes !== undefined &&
    (!Number.isSafeInteger(options.maximumBytes) ||
      options.maximumBytes <= 0 ||
      options.maximumBytes > maximumPickerBytes)
  ) {
    throw new PlatformError("FILE_INVALID_ARGUMENT", "The file size limit is invalid.")
  }
  return { ...options, accept }
}

function validatedPickedDocuments(
  result: { contractVersion?: unknown; operationId?: unknown; files?: unknown },
  operationId: string,
  options: FilePickOptions,
): PickedFile[] {
  if (
    result.contractVersion !== documentFilesContractVersion ||
    result.operationId !== operationId ||
    !Array.isArray(result.files) ||
    result.files.length === 0 ||
    result.files.length > (options.multiple ? 20 : 1)
  ) {
    throw new PlatformError("FILE_PICK_FAILED", "The document picker returned an invalid result.")
  }

  return result.files.map((candidate: NativePickedDocument) => {
    if (
      typeof candidate?.name !== "string" ||
      !candidate.name ||
      new TextEncoder().encode(candidate.name).byteLength > 120 ||
      typeof candidate.mimeType !== "string" ||
      !isValidMimeType(candidate.mimeType, false) ||
      !Number.isSafeInteger(candidate.size) ||
      candidate.size < 0 ||
      (options.maximumBytes !== undefined && candidate.size > options.maximumBytes) ||
      typeof candidate.uri !== "string" ||
      !candidate.uri.startsWith("content://")
    ) {
      throw new PlatformError("FILE_PICK_FAILED", "The document picker returned invalid metadata.")
    }
    return {
      name: candidate.name,
      mimeType: candidate.mimeType,
      size: candidate.size,
      uri: candidate.uri,
    }
  })
}

async function discardSave(options: SaveDocumentOptions): Promise<void> {
  await DocumentFiles.discardSave(options).catch(() => undefined)
  await Filesystem.rmdir({
    path: `${saveCacheDirectory}/${options.operationId}`,
    directory: Directory.Cache,
    recursive: true,
  }).catch(() => undefined)
}

const maximumClipboardBytes = 1024 * 1024

function mappedClipboardError(error: unknown): PlatformError {
  if (error instanceof PlatformError) return error
  return nativeRejectionCode(error) === "CLIPBOARD_INVALID_ARGUMENT"
    ? new PlatformError("CLIPBOARD_INVALID_ARGUMENT", "The clipboard request was invalid.")
    : new PlatformError("CLIPBOARD_WRITE_FAILED", "The value could not be copied.", true, error)
}

async function writeClipboardValue(value: string, sensitive: boolean): Promise<void> {
  if (new TextEncoder().encode(value).byteLength > maximumClipboardBytes) {
    throw new PlatformError(
      "CLIPBOARD_INVALID_ARGUMENT",
      "The copied value exceeds the clipboard size limit.",
    )
  }
  try {
    await SensitiveClipboard.write({
      contractVersion: sensitiveClipboardContractVersion,
      value,
      sensitive,
    })
  } catch (error) {
    throw mappedClipboardError(error)
  }
}

/**
 * Best-effort janitor trigger. The native pass is single-flight and bounded; failures and
 * already-running rejections are ignored because cleanup must never delay or block a
 * generated-file operation. Startup recovery is handled natively when the bridge loads.
 */
function sweepGeneratedCache(): void {
  void GeneratedCache.cleanup({ contractVersion: generatedCacheContractVersion }).catch(
    () => undefined,
  )
}

const maximumNativeReadBytes = 16 * 1024 * 1024
const maximumNativeDigestBytes = 1024 * 1024 * 1024
const nativeDigestAlgorithms: readonly ContentDigestAlgorithm[] = ["sha-1", "sha-256", "sha-512"]

function validatedContentUri(file: PickedFile): string {
  if (typeof file.uri !== "string" || !file.uri.startsWith("content://")) {
    throw new PlatformError("FILE_INVALID_ARGUMENT", "The selected document URI is invalid.")
  }
  return file.uri
}

function validatedDigestAlgorithm(algorithm: ContentDigestAlgorithm): ContentDigestAlgorithm {
  if (!nativeDigestAlgorithms.includes(algorithm)) {
    throw new PlatformError("FILE_INVALID_ARGUMENT", "The digest algorithm is unsupported.")
  }
  return algorithm
}

function validatedContentReadLimit(maximumBytes: number): number {
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes <= 0 ||
    maximumBytes > maximumNativeReadBytes
  ) {
    throw new PlatformError("FILE_INVALID_ARGUMENT", "The read size limit is invalid.")
  }
  return maximumBytes
}

function abortCancelled(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new PlatformError("FILE_READ_CANCELLED", "The operation was cancelled.")
  }
}

function stableNotificationId(value: string): number {
  let hash = 0
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) | 0
  return Math.abs(hash || 1)
}

function normalizeConnectionType(type: string): NetworkState["connectionType"] {
  if (type === "wifi" || type === "cellular" || type === "none") return type
  return "unknown"
}

const capacitorLifecycle = {
  current() {
    return { active: document.visibilityState === "visible" }
  },
  async subscribe(listener: (state: { active: boolean }) => void) {
    const handle = await App.addListener("appStateChange", ({ isActive }) =>
      listener({ active: isActive }),
    )
    return () => handle.remove()
  },
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
        await writeClipboardValue(value, options?.sensitive === true)
        if (options?.clearAfterMs) {
          window.setTimeout(
            () =>
              void Clipboard.read()
                .then(({ value: current }) =>
                  current === value ? writeClipboardValue("", false) : Promise.resolve(),
                )
                .catch(() => undefined),
            options.clearAfterMs,
          )
        }
      } catch (error) {
        throw mappedClipboardError(error)
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
      try {
        await Preferences.remove({ key: `${preferencePrefix}${key}` })
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
        const { keys } = await Preferences.keys()
        await Promise.all(
          keys
            .filter((key) => key.startsWith(preferencePrefix))
            .map((key) => Preferences.remove({ key })),
        )
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
    async pick(options) {
      const validated = validatedPickOptions(options)
      const operationId = secureRandomService.uuid()
      try {
        const result = await DocumentFiles.pickDocuments({
          contractVersion: documentFilesContractVersion,
          operationId,
          accept: validated.accept,
          multiple: validated.multiple ?? false,
          maximumBytes: validated.maximumBytes,
        })
        return validatedPickedDocuments(result, operationId, validated)
      } catch (error) {
        throw mappedNativeFileError(error, "FILE_PICK_FAILED")
      }
    },
    async share(file) {
      sweepGeneratedCache()
      try {
        const safeName = sanitizeGeneratedFileName(file.name)
        const saved = await Filesystem.writeFile({
          path: `share/${safeName}`,
          data: file.data,
          directory: Directory.Cache,
          encoding: file.encoding === "utf8" ? Encoding.UTF8 : undefined,
          recursive: true,
        })
        await Share.share({ title: safeName, files: [saved.uri] })
      } catch (error) {
        throw new PlatformError("FILE_SHARE_FAILED", "The file could not be shared.", true, error)
      }
    },
    async saveAs(file) {
      sweepGeneratedCache()
      const operationId = secureRandomService.uuid()
      const name = sanitizeGeneratedFileName(file.name)
      if (!isValidMimeType(file.mimeType, false)) {
        throw new PlatformError("FILE_INVALID_ARGUMENT", "The output MIME type is invalid.")
      }

      let size: number
      try {
        size = validatedGeneratedFileBytes(file).byteLength
      } catch (error) {
        if (error instanceof RangeError) {
          throw new PlatformError("FILE_TOO_LARGE", error.message)
        }
        throw new PlatformError("FILE_INVALID_ARGUMENT", "The generated file data is invalid.")
      }

      const options: SaveDocumentOptions = {
        contractVersion: documentFilesContractVersion,
        operationId,
        name,
        mimeType: file.mimeType.toLowerCase(),
        size,
      }
      try {
        await Filesystem.writeFile({
          path: `${saveCacheDirectory}/${operationId}/${name}`,
          data: file.data,
          directory: Directory.Cache,
          encoding: file.encoding === "utf8" ? Encoding.UTF8 : undefined,
          recursive: true,
        })
        await DocumentFiles.saveDocument(options)
      } catch (error) {
        throw mappedNativeFileError(error, "FILE_SAVE_FAILED")
      } finally {
        await discardSave(options)
      }
    },
    async readContent(file, options, signal) {
      abortCancelled(signal)
      const uri = validatedContentUri(file)
      const maximumBytes = validatedContentReadLimit(options.maximumBytes)
      if (Number.isSafeInteger(file.size) && file.size > maximumBytes) {
        throw new PlatformError("FILE_TOO_LARGE", "The document exceeds the read limit.")
      }
      try {
        const result = await DocumentFiles.readContent({
          contractVersion: documentFilesContractVersion,
          uri,
          maximumBytes,
        })
        return { size: result.size, data: result.data, encoding: "base64" }
      } catch (error) {
        throw mappedNativeFileError(error, "FILE_READ_FAILED")
      }
    },
    async digestContent(file, options, signal) {
      abortCancelled(signal)
      const algorithm = validatedDigestAlgorithm(options.algorithm)
      const uri = validatedContentUri(file)
      if (Number.isSafeInteger(file.size) && file.size > maximumNativeDigestBytes) {
        throw new PlatformError("FILE_TOO_LARGE", "The document exceeds the digest limit.")
      }
      const operationId = secureRandomService.uuid()
      const onAbort = () => {
        void DocumentFiles.cancelDigest({
          contractVersion: documentFilesContractVersion,
          operationId,
        }).catch(() => undefined)
      }
      signal?.addEventListener("abort", onAbort, { once: true })
      try {
        const result = await DocumentFiles.digestContent({
          contractVersion: documentFilesContractVersion,
          operationId,
          uri,
          algorithm,
        })
        return { algorithm, digestHex: result.digest, size: result.size }
      } catch (error) {
        throw mappedNativeFileError(error, "FILE_READ_FAILED")
      } finally {
        signal?.removeEventListener("abort", onAbort)
      }
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
        await LocalNotifications.createChannel({
          id: notification.channelId,
          name: "Timers",
          description: "Best-effort timer completion alerts",
          importance: 3,
        })
        await LocalNotifications.schedule({
          notifications: [
            {
              id: stableNotificationId(notification.id),
              title: notification.title,
              body: notification.body,
              schedule: { at: notification.at, allowWhileIdle: false },
              channelId: notification.channelId,
              isExactNotification: false,
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
  connection: capacitorConnectionService,
  browser: {
    async open(url) {
      const validatedUrl = validatedExternalUrl(url)
      try {
        await Browser.open({ url: validatedUrl, presentationStyle: "popover" })
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
  lifecycle: capacitorLifecycle,
  sensors: capacitorSensorService,
  haptics: {
    async confirm() {
      await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
    },
  },
  microphone: createMicrophoneRecorderService({ lifecycle: capacitorLifecycle }),
}
