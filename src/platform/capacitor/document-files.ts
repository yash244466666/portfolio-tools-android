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

interface DocumentFilesPlugin {
  pickDocuments(options: PickDocumentsOptions): Promise<PickDocumentsResult>
  saveDocument(options: SaveDocumentOptions): Promise<void>
  discardSave(options: SaveDocumentOptions): Promise<void>
}

export const DocumentFiles = registerPlugin<DocumentFilesPlugin>("DocumentFiles")
