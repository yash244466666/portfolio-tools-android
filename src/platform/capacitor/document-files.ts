import { registerPlugin } from "@capacitor/core"

export const documentFilesContractVersion = 1

export interface NativePickedDocument {
  name: string
  mimeType: string
  size: number
  uri: string
}

export interface PickDocumentsOptions {
  contractVersion: number
  operationId: string
  accept: string[]
  multiple: boolean
  maximumBytes?: number
}

export interface PickDocumentsResult {
  contractVersion: number
  operationId: string
  files: NativePickedDocument[]
}

export interface SaveDocumentOptions {
  contractVersion: number
  operationId: string
  name: string
  mimeType: string
  size: number
}

export interface DigestContentOptions {
  contractVersion: number
  operationId: string
  uri: string
  algorithm: string
}

export interface NativeContentDigest {
  contractVersion: number
  operationId: string
  algorithm: string
  digest: string
  size: number
}

export interface ReadContentOptions {
  contractVersion: number
  uri: string
  maximumBytes?: number
}

export interface NativeBoundedContent {
  contractVersion: number
  size: number
  data: string
}

interface DocumentFilesPlugin {
  pickDocuments(options: PickDocumentsOptions): Promise<PickDocumentsResult>
  saveDocument(options: SaveDocumentOptions): Promise<void>
  discardSave(options: SaveDocumentOptions): Promise<void>
  digestContent(options: DigestContentOptions): Promise<NativeContentDigest>
  cancelDigest(options: { contractVersion: number; operationId: string }): Promise<void>
  readContent(options: ReadContentOptions): Promise<NativeBoundedContent>
}

export const DocumentFiles = registerPlugin<DocumentFilesPlugin>("DocumentFiles")
