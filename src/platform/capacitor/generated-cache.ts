import { registerPlugin } from "@capacitor/core"

export const generatedCacheContractVersion = 1

export interface GeneratedCacheCleanupOptions {
  contractVersion: number
}

export interface GeneratedCacheCleanupResult {
  contractVersion: number
  deletedFiles: number
  deletedDirectories: number
  freedBytes: number
}

interface GeneratedCachePlugin {
  cleanup(options: GeneratedCacheCleanupOptions): Promise<GeneratedCacheCleanupResult>
}

export const GeneratedCache = registerPlugin<GeneratedCachePlugin>("GeneratedCache")
