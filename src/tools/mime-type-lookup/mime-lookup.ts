import { allMimeTypes, type MimeTypeEntry } from "./mime-types"

export const mimeLookupTabs = ["ext-to-mime", "mime-to-ext"] as const

export type MimeLookupTab = (typeof mimeLookupTabs)[number]

export const maximumMimeQueryChars = 100

export function getMimeTab(tab: MimeLookupTab): {
  id: MimeLookupTab
  label: string
  searchLabel: string
  placeholder: string
  copyTarget: (entry: MimeTypeEntry) => string
} {
  if (tab === "ext-to-mime") {
    return {
      id: "ext-to-mime",
      label: "Extension to MIME",
      searchLabel: "Search extensions",
      placeholder: "e.g. pdf, jpg, docx",
      copyTarget: (entry) => entry.mimeType,
    }
  }
  return {
    id: "mime-to-ext",
    label: "MIME to Extension",
    searchLabel: "Search MIME types",
    placeholder: "e.g. application/pdf, image/png",
    copyTarget: (entry) => entry.extension,
  }
}

/**
 * Filters the audited MIME dataset for the active direction. In
 * extension mode the query matches the extension and description; in MIME
 * mode it matches the MIME type and description.
 */
export function filterMimeTypes(query: string, tab: MimeLookupTab): MimeTypeEntry[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return allMimeTypes
  }
  return allMimeTypes.filter((entry) => {
    const primary =
      tab === "ext-to-mime" ? entry.extension.toLowerCase() : entry.mimeType.toLowerCase()
    return primary.includes(normalized) || entry.description.toLowerCase().includes(normalized)
  })
}
