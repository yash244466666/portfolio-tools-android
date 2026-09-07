/**
 * Pure SQL formatting wrapper over the `sql-formatter` library.
 *
 * Upstream rendered raw library error text into the UI; here failures produce
 * a fixed message because tokenizer diagnostics can echo user input. Minify
 * collapses the formatter's newlines after formatting instead of relying on a
 * separate dialect setting.
 */

import { format, type FormatOptionsWithLanguage } from "sql-formatter"

export const maximumSqlLength = 50_000

export const sqlDialects = ["sql", "mysql", "postgresql"] as const
export type SqlDialect = (typeof sqlDialects)[number]

export interface SqlResult {
  output: string
  message: string
}

function formatSql(
  input: string,
  dialect: SqlDialect,
  options: Partial<FormatOptionsWithLanguage>,
): SqlResult {
  if (input.length > maximumSqlLength) {
    return {
      output: "",
      message: `The SQL is limited to ${maximumSqlLength.toLocaleString("en-US")} characters.`,
    }
  }
  if (input.trim() === "") {
    return { output: "", message: "" }
  }
  let output: string
  try {
    output = format(input, { language: dialect, tabWidth: 2, ...options })
  } catch {
    return { output: "", message: "The SQL could not be parsed for formatting." }
  }
  if (output.length > maximumSqlLength * 4) {
    return { output: "", message: "The formatted SQL is too large to display." }
  }
  return { output, message: "" }
}

/** Pretty-prints SQL with two-space indentation in the chosen dialect. */
export function formatSqlStatement(input: string, dialect: SqlDialect): SqlResult {
  return formatSql(input, dialect, {})
}

/**
 * Formats then joins the formatted lines with single spaces, producing a
 * one-line statement. Only the newlines the formatter inserted are collapsed;
 * spacing inside string literals on one line is preserved. (A string literal
 * that itself spans lines is joined at its newlines — a documented edge.)
 */
export function minifySqlStatement(input: string, dialect: SqlDialect): SqlResult {
  const formatted = formatSql(input, dialect, { denseOperators: true })
  if (formatted.message !== "" || formatted.output === "") return formatted
  return { output: formatted.output.replace(/\n\s*/g, " ").trim(), message: "" }
}
