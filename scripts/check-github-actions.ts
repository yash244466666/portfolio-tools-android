import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const workflowPath = resolve(import.meta.dirname, "../.github/workflows/ci.yml")
const workflow = readFileSync(workflowPath, "utf8")
const actionPattern = /^\s*-\s+uses:\s+([^@\s]+)@([^\s#]+)/gm
const violations: string[] = []
let actionCount = 0

for (const match of workflow.matchAll(actionPattern)) {
  const action = match[1]
  const reference = match[2]
  if (!action || !reference) continue
  actionCount += 1
  if (!action.startsWith("./") && !/^[a-f0-9]{40}$/.test(reference)) {
    violations.push(`${action}@${reference}`)
  }
}

if (actionCount === 0) {
  throw new Error(`No action references found in ${workflowPath}`)
}
if (violations.length > 0) {
  throw new Error(`GitHub Actions must use full immutable commit SHAs: ${violations.join(", ")}`)
}
if (!/^permissions:\n\s+contents:\s+read$/m.test(workflow)) {
  throw new Error("GitHub Actions workflow must retain top-level read-only contents permission")
}

console.log(`GitHub Actions policy valid: ${actionCount} immutable references; read-only contents.`)
