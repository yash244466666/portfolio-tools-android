export type Unsubscribe = () => void | Promise<void>

export type PlatformKind = "web" | "android"

export interface ClipboardWriteOptions {
  sensitive?: boolean
  clearAfterMs?: number
}

export interface ClipboardService {
  readText(): Promise<string>
  writeText(value: string, options?: ClipboardWriteOptions): Promise<void>
}

export interface PreferenceStore {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
  clear(): Promise<void>
}

export interface PickedFile {
  name: string
  mimeType: string
  size: number
  uri?: string
  file?: File
}

export interface GeneratedFile {
  name: string
  mimeType: string
  data: string
  encoding: "utf8" | "base64"
}

export interface FilePickOptions {
  accept: string[]
  multiple?: boolean
  maximumBytes?: number
}

export interface BoundedContent {
  size: number
  data: string
  encoding: "base64"
}

export type ContentDigestAlgorithm = "sha-1" | "sha-256" | "sha-512"

export interface ContentDigest {
  algorithm: ContentDigestAlgorithm
  digestHex: string
  size: number
}

export interface ContentReadOptions {
  /** Hard native cap is 16 MiB; tools pass their own smaller bound. */
  maximumBytes: number
}

export interface ContentDigestOptions {
  algorithm: ContentDigestAlgorithm
}

export interface FileService {
  pick(options: FilePickOptions): Promise<PickedFile[]>
  share(file: GeneratedFile): Promise<void>
  saveAs(file: GeneratedFile): Promise<void>
  /** Bounded in-memory copy of a picked file; oversized content is rejected, never truncated. */
  readContent(
    file: PickedFile,
    options: ContentReadOptions,
    signal?: AbortSignal,
  ): Promise<BoundedContent>
  /** Streams a digest of a picked file; large content never crosses the bridge in full. */
  digestContent(
    file: PickedFile,
    options: ContentDigestOptions,
    signal?: AbortSignal,
  ): Promise<ContentDigest>
}

export interface NotificationRequestResult {
  granted: boolean
  canAskAgain: boolean
}

export interface ScheduledNotification {
  id: string
  title: string
  body: string
  at: Date
  channelId: "timers"
}

export interface NotificationService {
  requestPermission(): Promise<NotificationRequestResult>
  schedule(notification: ScheduledNotification): Promise<void>
  cancel(id: string): Promise<void>
}

export interface NetworkState {
  connected: boolean
  connectionType: "wifi" | "cellular" | "none" | "unknown"
}

export interface NetworkService {
  current(): Promise<NetworkState>
  subscribe(listener: (state: NetworkState) => void): Promise<Unsubscribe>
}

export interface ExternalBrowserService {
  open(url: URL): Promise<void>
}

export interface RandomService {
  bytes(length: number): Uint8Array
  uuid(): string
}

export interface LifecycleState {
  active: boolean
}

export interface LifecycleService {
  current(): LifecycleState
  subscribe(listener: (state: LifecycleState) => void): Promise<Unsubscribe>
}

export interface HapticsService {
  confirm(): Promise<void>
}

export type RecordingFinalReason =
  "user" | "duration-limit" | "size-limit" | "interrupted" | "failed"

export interface RecordingStartOptions {
  /** Hard stop and finalize at this duration; the service clamps to its own caps. */
  maximumDurationMs: number
  /** Hard stop and finalize at this accumulated encoded size. */
  maximumBytes: number
}

export interface RecordingCallbacks {
  /** Periodic capture level (0..1) while recording. */
  onLevel?: (level: number) => void
  /**
   * Invoked exactly once when the take is finalized without a user Stop
   * (limit reached, lifecycle inactive, or encoder failure).
   */
  onFinalized?: (result: RecordingResult) => void
}

export interface RecordingResult {
  data: ArrayBuffer
  mimeType: string
  /** Wall-clock-derived duration of the finalized take. */
  durationMs: number
  finalReason: RecordingFinalReason
}

export interface MicrophoneRecorderService {
  /** Resolves once capture starts. Rejects with typed microphone errors. */
  start(options: RecordingStartOptions, callbacks?: RecordingCallbacks): Promise<void>
  /**
   * Finalizes and resolves with the take. Also resolves with the take when a
   * limit or the lifecycle already finalized it; rejects when nothing exists.
   */
  stop(): Promise<RecordingResult>
  /** Discards the active take and releases the microphone; safe when idle. */
  cancel(): Promise<void>
}

export interface PlatformServices {
  kind: PlatformKind
  clipboard: ClipboardService
  preferences: PreferenceStore
  files: FileService
  notifications: NotificationService
  network: NetworkService
  browser: ExternalBrowserService
  random: RandomService
  lifecycle: LifecycleService
  haptics: HapticsService
  microphone: MicrophoneRecorderService
}
