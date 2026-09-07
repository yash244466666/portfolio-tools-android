/**
 * Pure CSV ↔ JSON conversion.
 *
 * Upstream parsed each line independently, which broke RFC 4180 records whose
 * quoted fields contain embedded newlines, silently dropped row values beyond
 * the header count, and stringified nested JSON values as "[object Object]".
 * This module parses the whole text with a quoted-field state machine,
 * preserves extra cells under generated column names, serializes nested values
 * with JSON.stringify, and neutralizes spreadsheet formula injection on export.
 */

export const maximumCsvLength = 50_000

/** Maximum serialized JSON output accepted back in or written out. */
export const maximumJsonOutputLength = 256 * 1024

export const csvDelimiters = [
  { label: "Comma", value: "," },
  { label: "Semicolon", value: ";" },
  { label: "Tab", value: "\t" },
] as const

export type CsvDelimiter = (typeof csvDelimiters)[number]["value"]

/** Characters spreadsheets treat as formula starters when a cell begins with one. */
const formulaPrefixes = ["=", "+", "-", "@", "\t", "\r"] as const

export interface CsvParseResult {
  rows: string[][]
  message: string
}

/**
 * Parses CSV text per RFC 4180: quoted fields may contain delimiters, escaped
 * double quotes (""), and embedded line breaks. Returns an error message
 * instead of throwing when a quote is left unterminated.
 */
export function parseCsv(text: string, delimiter: CsvDelimiter): CsvParseResult {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let inQuotes = false
  let cellWasQuoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? ""
    if (inQuotes) {
      if (char === '"') {
        const next = text[index + 1] ?? ""
        if (next === '"') {
          cell += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
      continue
    }
    if (char === '"' && cell === "") {
      inQuotes = true
      cellWasQuoted = true
      continue
    }
    if (char === delimiter) {
      row.push(cell)
      cell = ""
      cellWasQuoted = false
      continue
    }
    if (char === "\n" || char === "\r") {
      // Accept CRLF as one record break; a lone CR or LF also ends the record.
      if (char === "\r" && text[index + 1] === "\n") index += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
      cellWasQuoted = false
      continue
    }
    cell += char
  }

  if (inQuotes) {
    return { rows: [], message: "A quoted field is missing its closing quote." }
  }
  if (cell !== "" || cellWasQuoted || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return { rows, message: "" }
}

function serializeCsvCell(value: string, delimiter: CsvDelimiter): string {
  const mustQuote =
    value.includes(delimiter) || value.includes('"') || value.includes("\n") || value.includes("\r")
  const escaped = value.replaceAll('"', '""')
  return mustQuote ? `"${escaped}"` : value
}

/**
 * Builds one CSV record. Leading formula-trigger characters are neutralized
 * with a single-quote prefix so spreadsheet applications do not execute cell
 * contents; the caller must disclose this transformation to the user.
 */
export function formatCsvRow(cells: string[], delimiter: CsvDelimiter): string {
  const serialized = cells.map((value) => {
    const neutralized = formulaPrefixes.some((prefix) => value.startsWith(prefix))
      ? `'${value}`
      : value
    return serializeCsvCell(neutralized, delimiter)
  })
  return serialized.join(delimiter)
}

export interface CsvToJsonResult {
  headers: string[]
  rows: Record<string, string>[]
  /** Rows whose cell count differed from the header count. */
  unevenRowCount: number
  message: string
}

/**
 * Converts CSV text to JSON rows. Extra cells beyond the header count are kept
 * under generated `column-N` names instead of being silently dropped; rows
 * shorter than the header count simply leave the later keys absent.
 */
export function csvToJson(
  text: string,
  options: { delimiter: CsvDelimiter; hasHeader: boolean },
): CsvToJsonResult {
  if (text.length > maximumCsvLength) {
    return { headers: [], rows: [], unevenRowCount: 0, message: "CSV text is too long." }
  }
  const parsed = parseCsv(text, options.delimiter)
  if (parsed.message !== "") {
    return { headers: [], rows: [], unevenRowCount: 0, message: parsed.message }
  }
  if (parsed.rows.length === 0) {
    return { headers: [], rows: [], unevenRowCount: 0, message: "" }
  }

  const headerRow = parsed.rows[0] ?? []
  const headers =
    options.hasHeader && headerRow.every((name) => name.trim() !== "")
      ? headerRow.map((name) => name.trim())
      : headerRow.map((_, index) => `column-${index + 1}`)

  const dataRows = options.hasHeader ? parsed.rows.slice(1) : parsed.rows
  let unevenRowCount = 0
  const rows = dataRows.map((cells) => {
    if (cells.length !== headers.length) unevenRowCount += 1
    const row: Record<string, string> = {}
    for (let index = 0; index < cells.length; index += 1) {
      row[headers[index] ?? `column-${index + 1}`] = cells[index] ?? ""
    }
    return row
  })
  return { headers, rows, unevenRowCount, message: "" }
}

export interface JsonToCsvResult {
  csv: string
  /** Cells that were nested and therefore serialized as JSON strings. */
  nestedCellCount: number
  /** Cells neutralized because they began with a formula-trigger character. */
  neutralizedCellCount: number
  message: string
}

/** Serializes one JSON value as a CSV cell string. */
export function serializeJsonValue(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  return JSON.stringify(value)
}

/**
 * Converts JSON to CSV. Accepts an array of records, an array of arrays, or a
 * single object (emitted as one row with the object's keys as headers).
 */
export function jsonToCsv(text: string, options: { delimiter: CsvDelimiter }): JsonToCsvResult {
  if (text.length > maximumCsvLength) {
    return {
      csv: "",
      nestedCellCount: 0,
      neutralizedCellCount: 0,
      message: "JSON text is too long.",
    }
  }
  let value: unknown
  try {
    value = JSON.parse(text) as unknown
  } catch {
    return {
      csv: "",
      nestedCellCount: 0,
      neutralizedCellCount: 0,
      message: "The JSON is not valid.",
    }
  }

  let headerRow: string[]
  let dataRows: string[][]
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { csv: "", nestedCellCount: 0, neutralizedCellCount: 0, message: "" }
    }
    const first: unknown = value[0]
    const allRecords = value.every(
      (entry) => entry !== null && typeof entry === "object" && !Array.isArray(entry),
    )
    if (first !== null && typeof first === "object" && !Array.isArray(first)) {
      if (!allRecords) {
        return {
          csv: "",
          nestedCellCount: 0,
          neutralizedCellCount: 0,
          message: "Mixed arrays are not supported. Use objects with matching keys.",
        }
      }
      headerRow = Object.keys(first)
      // Union of keys across rows, so later rows may add columns.
      const keys = new Set(headerRow)
      for (const entry of value) {
        if (entry !== null && typeof entry === "object" && !Array.isArray(entry)) {
          for (const key of Object.keys(entry as Record<string, unknown>)) keys.add(key)
        }
      }
      headerRow = [...keys]
      dataRows = value.map((entry) =>
        headerRow.map((key) => serializeJsonValue((entry as Record<string, unknown>)[key])),
      )
    } else {
      // Array of arrays or scalars: no header, one column per position.
      const width = Math.max(...value.map((entry) => (Array.isArray(entry) ? entry.length : 1)))
      headerRow = Array.from({ length: width }, (_, index) => `column-${index + 1}`)
      dataRows = value.map((entry) =>
        Array.isArray(entry)
          ? entry.map((cell) => serializeJsonValue(cell))
          : [serializeJsonValue(entry)],
      )
    }
  } else if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>
    headerRow = Object.keys(record)
    dataRows = [headerRow.map((key) => serializeJsonValue(record[key]))]
  } else {
    return {
      csv: "",
      nestedCellCount: 0,
      neutralizedCellCount: 0,
      message: "The JSON must be an object or an array.",
    }
  }

  let nestedCellCount = 0
  let neutralizedCellCount = 0
  const serializedRows: string[] = []

  const headerLine = headerRow.map((name) => {
    if (/[=+\-@\t\r]/.test(name.charAt(0))) neutralizedCellCount += 1
    return serializeCsvCell(name, options.delimiter)
  })
  if (headerRow.length > 0) serializedRows.push(headerLine.join(options.delimiter))

  for (const cells of dataRows) {
    const line = cells
      .map((rawCell) => {
        let cell = rawCell
        if (cell.startsWith("{") || cell.startsWith("[")) nestedCellCount += 1
        if (formulaPrefixes.some((prefix) => cell.startsWith(prefix))) {
          neutralizedCellCount += 1
          cell = `'${cell}`
        }
        return serializeCsvCell(cell, options.delimiter)
      })
      .join(options.delimiter)
    serializedRows.push(line)
  }

  return {
    csv: serializedRows.join("\n"),
    nestedCellCount,
    neutralizedCellCount,
    message: "",
  }
}
