import { readdirSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const workflowDirectory = resolve(import.meta.dirname, "../.github/workflows")
const workflowFiles = readdirSync(workflowDirectory)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .sort()

if (workflowFiles.length === 0) {
  throw new Error(`No workflow files found in ${workflowDirectory}`)
}

const actionPattern = /^\s*-\s+uses:\s+([^@\s]+)@([^\s#]+)/gm
const violations: string[] = []
let actionCount = 0

for (const file of workflowFiles) {
  const path = resolve(workflowDirectory, file)
  const workflow = readFileSync(path, "utf8")

  for (const match of workflow.matchAll(actionPattern)) {
    const action = match[1]
    const reference = match[2]
    if (!action || !reference) continue
    actionCount += 1
    if (!action.startsWith("./") && !/^[a-f0-9]{40}$/.test(reference)) {
      violations.push(`${file}: ${action}@${reference}`)
    }
  }

  // Every workflow must start read-only and opt into any write scope at the
  // job level. This keeps a compromised or mistaken workflow from inheriting
  // repository write access by default.
  if (!/^permissions:\n\s+contents:\s+read$/m.test(workflow)) {
    throw new Error(
      `${file} must retain a top-level read-only contents permission and scope writes to jobs`,
    )
  }
}

if (actionCount === 0) {
  throw new Error(`No action references found in ${workflowDirectory}`)
}
if (violations.length > 0) {
  throw new Error(`GitHub Actions must use full immutable commit SHAs: ${violations.join(", ")}`)
}

console.log(
  `GitHub Actions policy valid: ${actionCount} immutable references across ${workflowFiles.length} workflows; top-level read-only contents.`,
)
