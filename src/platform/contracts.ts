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

export interface FileService {
  pick(options: FilePickOptions): Promise<PickedFile[]>
  share(file: GeneratedFile): Promise<void>
  saveAs(file: GeneratedFile): Promise<void>
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
}
