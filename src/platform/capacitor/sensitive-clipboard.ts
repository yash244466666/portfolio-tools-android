import { registerPlugin } from "@capacitor/core"

export const sensitiveClipboardContractVersion = 1

export interface SensitiveClipboardWriteOptions {
  contractVersion: number
  value: string
  sensitive: boolean
}

interface SensitiveClipboardPlugin {
  write(options: SensitiveClipboardWriteOptions): Promise<void>
}

export const SensitiveClipboard = registerPlugin<SensitiveClipboardPlugin>("SensitiveClipboard")
