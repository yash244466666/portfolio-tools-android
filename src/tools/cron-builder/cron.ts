/**
 * Pure cron expression parsing, validation, and description.
 *
 * Field names, ranges, day/month names, and presets are copied from the upstream
 * tool. Upstream validation only checked the 5-field count, which accepted
 * expressions like "99 99 99 99 99" and rendered descriptions like
 * "on undefined"; `validateCronField` here adds real range and syntax checks,
 * and `describeCron` is guarded against non-finite numbers.
 */

export const cronFieldNames = ["Minute", "Hour", "Day of Month", "Month", "Day of Week"] as const

export const cronFieldRanges = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 6 },
] as const

export const dayOfWeekNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]
export const monthNames = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

export const cronPresets = [
  { label: "Every minute", value: "* * * * *" },
  { label: "Every hour", value: "0 * * * *" },
  { label: "Daily at midnight", value: "0 0 * * *" },
  { label: "Weekdays at 9am", value: "0 9 * * 1-5" },
  { label: "Every Sunday at noon", value: "0 12 * * 0" },
  { label: "Every 15 minutes", value: "*/15 * * * *" },
  { label: "First of every month", value: "0 0 1 * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
] as const

/** Maximum expression length before rejection, so validation stays bounded. */
export const maximumCronExpressionLength = 256

export interface CronParseResult {
  fields: string[] | null
  valid: boolean
  message: string
}

/**
 * Validates one cron field: each comma-separated atom must be `*`, a number in
 * range, a range `a-b` (non-wrapping), or any of those with a `/step`. Returns
 * an empty message when valid.
 */
export function validateCronField(field: string, index: number): string {
  const range = cronFieldRanges[index]
  if (range === undefined) return "Unknown field."
  if (field === "") return `${cronFieldNames[index]} is required.`

  for (const atom of field.split(",")) {
    if (atom === "") return `${cronFieldNames[index]} has an empty list item.`
    const [values, stepPart, ...extra] = atom.split("/")
    if (extra.length > 0) return `${cronFieldNames[index]} has too many "/".`
    if (stepPart !== undefined) {
      if (!/^\d+$/.test(stepPart)) return `${cronFieldNames[index]} has an invalid step.`
      if (Number.parseInt(stepPart, 10) < 1) {
        return `${cronFieldNames[index]} step must be at least 1.`
      }
    }
    if (values === undefined || values === "*") continue
    const bounds = values.split("-")
    if (bounds.length > 2) return `${cronFieldNames[index]} has too many "-".`
    for (const bound of bounds) {
      if (!/^\d+$/.test(bound)) {
        return `${cronFieldNames[index]} "${atom}" is not a number in range ${range.min}-${range.max}.`
      }
    }
    const start = Number.parseInt(bounds[0] ?? "", 10)
    const end = bounds.length === 2 ? Number.parseInt(bounds[1] ?? "", 10) : start
    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return `${cronFieldNames[index]} "${atom}" is not a valid number.`
    }
    if (start < range.min || end > range.max) {
      return `${cronFieldNames[index]} "${atom}" is outside range ${range.min}-${range.max}.`
    }
    if (start > end) {
      return `${cronFieldNames[index]} range "${atom}" must go from lower to higher.`
    }
  }
  return ""
}

/** Splits into exactly 5 fields and validates each one. */
export function parseCronFields(expression: string): CronParseResult {
  if (expression.length > maximumCronExpressionLength) {
    return { fields: null, valid: false, message: "Expression is too long." }
  }
  const parts = expression.trim().split(/\s+/)
  if (parts.length !== 5 || expression.trim() === "") {
    return {
      fields: null,
      valid: false,
      message: "Invalid expression. Must have 5 fields separated by spaces.",
    }
  }
  for (let index = 0; index < parts.length; index += 1) {
    const message = validateCronField(parts[index] ?? "", index)
    if (message !== "") return { fields: null, valid: false, message }
  }
  return { fields: [...parts], valid: true, message: "" }
}

/** Names one field token (single value, range, or step) for the description. */
function nameToken(token: string, index: number): string | null {
  const names = index === 3 ? monthNames : dayOfWeekNames
  const base = token.split("/")[0] ?? ""
  if (base === "*") return null
  const bounds = base.split("-")
  const start = Number.parseInt(bounds[0] ?? "", 10)
  const end = bounds.length === 2 ? Number.parseInt(bounds[1] ?? "", 10) : start
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  const startName = names[start]
  const endName = names[end]
  if (startName === undefined || endName === undefined) return null
  if (bounds.length === 2) return `${startName} through ${endName}`
  return startName
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

/**
 * Builds a plain-language description of a validated expression. Falls back to
 * the raw field text when a part has no natural phrasing.
 */
export function describeCron(fields: string[]): string {
  const [minute = "*", hour = "*", dayOfMonth = "*", month = "*", dayOfWeek = "*"] = fields

  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return "Every minute"
  }

  const parts: string[] = []

  // Time of day. Step expressions are described first so "0 */6 * * *" reads
  // "every 6 hours" instead of the combined time branch receiving a non-finite
  // hour.
  const hourStepMatch = hour.match(/^\*\/(\d+)$/)
  const minuteStepMatch = minute.match(/^\*\/(\d+)$/)
  if (hourStepMatch !== null) {
    parts.push(`every ${hourStepMatch[1]} hours`)
  } else if (minuteStepMatch !== null && hour === "*") {
    parts.push(`every ${minuteStepMatch[1]} minutes`)
  } else if (hour !== "*" && minute !== "*") {
    const h = Number.parseInt(hour, 10)
    const m = Number.parseInt(minute, 10)
    if (
      Number.isFinite(h) &&
      Number.isFinite(m) &&
      !hour.includes("/") &&
      !minute.includes("/") &&
      !hour.includes(",") &&
      !minute.includes(",")
    ) {
      parts.push(`at ${pad(h)}:${pad(m)}`)
    } else {
      parts.push(`at hour ${hour}, minute ${minute}`)
    }
  } else if (hour !== "*") {
    parts.push(`at hour ${hour}`)
  } else if (minute !== "*") {
    if (minute.includes("/")) {
      parts.push(`every ${minute.split("/")[1] ?? ""} minutes`)
    } else {
      parts.push(`at minute ${minute}`)
    }
  }

  // Day of week.
  if (dayOfWeek !== "*") {
    const named = dayOfWeek.split(",").map((token) => nameToken(token, 4))
    if (named.every((name) => name !== null)) {
      parts.push(`on ${named.join(", ")}`)
    } else {
      parts.push(`on day-of-week ${dayOfWeek}`)
    }
  }

  // Day of month.
  if (dayOfMonth !== "*") {
    const rangeMatch = dayOfMonth.match(/^(\d+)-(\d+)$/)
    if (rangeMatch !== null) {
      parts.push(`on days ${rangeMatch[1]} through ${rangeMatch[2]} of the month`)
    } else {
      parts.push(`on day ${dayOfMonth} of the month`)
    }
  }

  // Month.
  if (month !== "*") {
    const named = month.split(",").map((token) => nameToken(token, 3))
    if (named.every((name) => name !== null)) {
      parts.push(`in ${named.join(", ")}`)
    } else {
      parts.push(`in month ${month}`)
    }
  }

  if (parts.length === 0) {
    return [minute, hour, dayOfMonth, month, dayOfWeek].join(" ")
  }

  return parts.join(", ")
}
