/**
 * Pure YAML ↔ JSON conversion over js-yaml's safe schema.
 *
 * Upstream called `yaml.load` (already safe-schema in js-yaml v4) and dumped
 * with `noRefs` unset; here the safe loader is used explicitly, inputs and
 * outputs are length-bounded, and `noRefs: true` keeps alias nodes from being
 * re-serialized as anchors/aliases.
 */

import { dump, load } from "js-yaml"

export const maximumYamlLength = 50_000
export const maximumOutputLength = 256 * 1024

export interface ConvertResult {
  output: string
  message: string
}

function overLimitMessage(input: string, limit: number): string | null {
  if (input.length > limit) return "The input text is too long to convert."
  return null
}

/** Converts YAML text to pretty-printed JSON using js-yaml's safe schema. */
export function yamlToJson(input: string): ConvertResult {
  const overLimit = overLimitMessage(input, maximumYamlLength)
  if (overLimit !== null) return { output: "", message: overLimit }
  if (input.trim() === "") return { output: "", message: "" }
  let parsed: unknown
  try {
    parsed = load(input)
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : "Unknown YAML error."
    return { output: "", message: `The YAML is not valid: ${reason}` }
  }
  const output = JSON.stringify(parsed, null, 2)
  if (output === undefined || output.length > maximumOutputLength) {
    return { output: "", message: "The converted JSON exceeds the output size limit." }
  }
  return { output: output ?? "", message: "" }
}

/**
 * Converts JSON to YAML. Deeply nested JSON can exhaust the native parser's
 * stack, so a RangeError from JSON.parse is reported as a nesting failure.
 */
export function jsonToYaml(input: string): ConvertResult {
  const overLimit = overLimitMessage(input, maximumYamlLength)
  if (overLimit !== null) return { output: "", message: overLimit }
  if (input.trim() === "") return { output: "", message: "" }
  let parsed: unknown
  try {
    parsed = JSON.parse(input) as unknown
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      return { output: "", message: "The JSON is nested too deeply to convert." }
    }
    return { output: "", message: "The JSON is not valid." }
  }
  let output: string
  try {
    output = dump(parsed, { indent: 2, lineWidth: 120, noRefs: true })
  } catch (error: unknown) {
    if (error instanceof RangeError) {
      return { output: "", message: "The JSON is nested too deeply to convert." }
    }
    const reason = error instanceof Error ? error.message : "Unknown YAML error."
    return { output: "", message: `The value could not be serialized as YAML: ${reason}` }
  }
  if (output.length > maximumOutputLength) {
    return { output: "", message: "The converted YAML exceeds the output size limit." }
  }
  return { output, message: "" }
}
