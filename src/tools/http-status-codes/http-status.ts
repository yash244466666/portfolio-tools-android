import { httpStatusCodes, type HttpStatusCode } from "./http-status-data"

export const httpStatusCategories = ["all", "1xx", "2xx", "3xx", "4xx", "5xx"] as const

export type HttpStatusCategory = (typeof httpStatusCategories)[number]

export const maximumStatusQueryChars = 100

/**
 * Filters the audited status-code dataset by category tab and a free-text
 * query matched against the code, the reason-phrase name, and the
 * description. Empty queries return every entry in the category.
 */
export function filterStatusCodes(query: string, category: HttpStatusCategory): HttpStatusCode[] {
  const normalized = query.trim().toLowerCase()
  return httpStatusCodes.filter((entry) => {
    if (category !== "all" && entry.category !== category) {
      return false
    }
    if (!normalized) {
      return true
    }
    return (
      String(entry.code).includes(normalized) ||
      entry.name.toLowerCase().includes(normalized) ||
      entry.description.toLowerCase().includes(normalized)
    )
  })
}

export function getStatusCode(code: number): HttpStatusCode | undefined {
  return httpStatusCodes.find((entry) => entry.code === code)
}
