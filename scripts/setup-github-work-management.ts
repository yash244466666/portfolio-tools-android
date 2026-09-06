import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

type CategoryId = "core" | "dev" | "text" | "media" | "security" | "math"
type WorkType = "Epic" | "Tool" | "Foundation" | "Quality" | "Release" | "Bug"

interface ProjectFieldDefinition {
  name: string
  type: "SINGLE_SELECT" | "NUMBER"
  options?: string[]
}

interface LabelDefinition {
  name: string
  color: string
  description: string
}

interface MilestoneDefinition {
  key: string
  title: string
  description: string
}

interface WorkItemDefinition {
  key: string
  title: string
  parent?: string | null
  type: WorkType
  category: string
  phase: string
  priority: string
  risk: string
  estimate: number
  workflow: string
  milestone?: string
  outcome?: string
  acceptance?: string[]
  blockedBy?: string[]
  tier?: number
  verticalSlice?: boolean
  toolId?: string
}

interface ManifestEpic extends Omit<WorkItemDefinition, "type"> {
  type?: never
  outcome: string
  acceptance: string[]
}

interface ManifestTask extends WorkItemDefinition {
  type: Exclude<WorkType, "Epic" | "Tool" | "Bug">
  outcome: string
  acceptance: string[]
}

interface WorkManifest {
  schemaVersion: number
  repository: string
  auditedUpstreamCommit: string
  project: {
    title: string
    description: string
    visibility: "PRIVATE" | "PUBLIC"
    readme: string
    fields: ProjectFieldDefinition[]
  }
  labels: LabelDefinition[]
  milestones: MilestoneDefinition[]
  epics: ManifestEpic[]
  tasks: ManifestTask[]
  verticalSlice: string[]
  implementedTools: string[]
  tier2: string[]
  tier3: string[]
  tier4: string[]
  toolDependencies: Record<string, string[]>
  tools: [string, string, CategoryId][]
}

interface GitHubMilestone {
  id: number
  number: number
  title: string
  description: string | null
  state: "open" | "closed"
}

interface GitHubIssue {
  id: number
  node_id: string
  number: number
  title: string
  body: string | null
  state: "open" | "closed"
  html_url: string
  labels: ({ name: string } | string)[]
  milestone: { number: number } | null
  parent_issue_url?: string | null
  pull_request?: unknown
}

interface ProjectSummary {
  id: string
  number: number
  title: string
  url: string
}

interface ManagedProject extends ProjectSummary {
  owner: string
}

interface ProjectField {
  id: string
  name: string
  type: string
  dataType?: string
  options?: { id: string; name: string }[]
}

interface ProjectItem {
  id: string
  content?: { url?: string }
}

interface PullRequest {
  id: string
  url: string
  title: string
  body: string | null
  state: "OPEN" | "CLOSED" | "MERGED"
  mergedAt: string | null
}

interface CommandOptions {
  input?: string
  allowFailure?: boolean
}

interface CommandResult {
  status: number
  stdout: string
  stderr: string
}

const root = resolve(import.meta.dirname, "..")
const manifestPath = resolve(root, "config/github-work-items.json")
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as unknown as WorkManifest
const apply = process.argv.includes("--apply")
const ghBinary = process.env.GH_BIN ?? "gh"
const apiVersion = "2026-03-10"

const expectedCategoryCounts: Record<CategoryId, number> = {
  core: 7,
  dev: 45,
  text: 17,
  media: 3,
  security: 5,
  math: 10,
}

const categoryNames: Record<CategoryId, string> = {
  core: "Core",
  dev: "Developer",
  text: "Text",
  media: "Media",
  security: "Security",
  math: "Math",
}

const categoryEpics: Record<CategoryId, string> = {
  core: "core-epic",
  dev: "developer-epic",
  text: "text-epic",
  media: "media-epic",
  security: "security-epic",
  math: "math-epic",
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function unique<T>(values: T[], label: string): Set<T> {
  const seen = new Set<T>()
  for (const value of values) {
    invariant(!seen.has(value), `Duplicate ${label}: ${String(value)}`)
    seen.add(value)
  }
  return seen
}

function validateAcyclic(graph: Map<string, string[]>, label: string): void {
  const visiting = new Set<string>()
  const visited = new Set<string>()

  const visit = (key: string, path: string[]): void => {
    if (visited.has(key)) return
    invariant(!visiting.has(key), `${label} cycle: ${[...path, key].join(" -> ")}`)
    visiting.add(key)
    for (const next of graph.get(key) ?? []) visit(next, [...path, key])
    visiting.delete(key)
    visited.add(key)
  }

  for (const key of graph.keys()) visit(key, [])
}

function tierFor(toolId: string): number {
  if (manifest.tier2.includes(toolId)) return 2
  if (manifest.tier3.includes(toolId)) return 3
  if (manifest.tier4.includes(toolId)) return 4
  return 1
}

function validateManifest(): {
  toolIds: Set<string>
  tierCounts: number[]
  issueKeys: Set<string>
} {
  invariant(manifest.schemaVersion === 1, "Unsupported work-item manifest schema")
  invariant(
    manifest.repository === "yash244466666/portfolio-tools-android",
    "Unexpected repository",
  )
  invariant(manifest.tools.length === 87, `Expected 87 tools, found ${manifest.tools.length}`)

  const toolIds = unique(
    manifest.tools.map(([id]) => id),
    "tool ID",
  )
  unique(
    manifest.tools.map(([, label]) => label),
    "tool label",
  )
  unique(
    manifest.labels.map(({ name }) => name),
    "label",
  )
  unique(
    manifest.milestones.map(({ key }) => key),
    "milestone key",
  )
  unique(
    manifest.milestones.map(({ title }) => title),
    "milestone title",
  )
  unique(
    manifest.project.fields.map(({ name }) => name),
    "project field",
  )

  for (const [category, expected] of Object.entries(expectedCategoryCounts)) {
    const actual = manifest.tools.filter(([, , toolCategory]) => toolCategory === category).length
    invariant(actual === expected, `Expected ${expected} ${category} tools, found ${actual}`)
  }

  for (const [id, label, category] of manifest.tools) {
    invariant(typeof id === "string" && id.length > 0, "Tool ID must be non-empty")
    invariant(typeof label === "string" && label.length > 0, `Tool ${id} must have a label`)
    invariant(categoryNames[category], `Tool ${id} has unknown category ${category}`)
  }

  const verticalSlice = unique(manifest.verticalSlice, "vertical-slice tool")
  invariant(
    verticalSlice.size === 12,
    `Expected 12 vertical-slice tools, found ${verticalSlice.size}`,
  )
  for (const id of verticalSlice) invariant(toolIds.has(id), `Unknown vertical-slice tool: ${id}`)

  const implementedTools = unique(manifest.implementedTools, "implemented tool")
  invariant(
    implementedTools.size === 3,
    `Expected 3 implemented tools, found ${implementedTools.size}`,
  )
  for (const id of implementedTools) invariant(toolIds.has(id), `Unknown implemented tool: ${id}`)

  const tierCounts = [1, 2, 3, 4].map(
    (tier) => manifest.tools.filter(([id]) => tierFor(id) === tier).length,
  )
  invariant(
    tierCounts.join(",") === "67,15,2,3",
    `Expected tier counts 67,15,2,3, found ${tierCounts.join(",")}`,
  )

  for (const listName of ["tier2", "tier3", "tier4"] as const) {
    unique(manifest[listName], `${listName} tool`)
    for (const id of manifest[listName])
      invariant(toolIds.has(id), `Unknown ${listName} tool: ${id}`)
  }

  const issueKeys = unique(
    [
      ...manifest.epics.map(({ key }) => key),
      ...manifest.tasks.map(({ key }) => key),
      ...manifest.tools.map(([id]) => `tool:${id}`),
    ],
    "work-item key",
  )
  const milestoneKeys = new Set(manifest.milestones.map(({ key }) => key))
  const parentGraph = new Map<string, string[]>()
  const dependencyGraph = new Map<string, string[]>()

  for (const item of [...manifest.epics, ...manifest.tasks]) {
    invariant(item.key === "launch-v1" || item.parent, `${item.key} must have a parent`)
    invariant(item.key !== "launch-v1" || !item.parent, "launch-v1 must be the only root item")
    if (item.parent)
      invariant(issueKeys.has(item.parent), `${item.key} has unknown parent ${item.parent}`)
    parentGraph.set(item.key, item.parent ? [item.parent] : [])
    if (item.milestone) {
      invariant(
        milestoneKeys.has(item.milestone),
        `${item.key} has unknown milestone ${item.milestone}`,
      )
    }
    const blockers = [...unique(item.blockedBy ?? [], `${item.key} blocker`)]
    dependencyGraph.set(item.key, blockers)
    for (const blocker of blockers) {
      invariant(issueKeys.has(blocker), `${item.key} has unknown blocker ${blocker}`)
      invariant(blocker !== item.key, `${item.key} cannot block itself`)
    }
  }

  for (const [toolId, blockers] of Object.entries(manifest.toolDependencies)) {
    invariant(toolIds.has(toolId), `Dependencies reference unknown tool ${toolId}`)
    const key = `tool:${toolId}`
    const uniqueBlockers = [...unique(blockers, `${key} blocker`)]
    dependencyGraph.set(key, uniqueBlockers)
    for (const blocker of uniqueBlockers) {
      invariant(issueKeys.has(blocker), `Tool ${toolId} has unknown blocker ${blocker}`)
      invariant(blocker !== key, `${key} cannot block itself`)
    }
  }
  for (const [id, , category] of manifest.tools) {
    const key = `tool:${id}`
    parentGraph.set(key, [categoryEpics[category]])
    if (!dependencyGraph.has(key)) dependencyGraph.set(key, [])
  }
  validateAcyclic(parentGraph, "Parent hierarchy")
  validateAcyclic(dependencyGraph, "Dependency graph")

  const labelNames = new Set(manifest.labels.map(({ name }) => name))
  for (const required of [
    "type:epic",
    "type:tool",
    "type:foundation",
    "type:quality",
    "type:release",
    "type:bug",
    "status:triage",
    "status:ready",
    "status:blocked",
    "status:device-qa",
    "scope:vertical-slice",
  ]) {
    invariant(labelNames.has(required), `Missing required label ${required}`)
  }

  return { toolIds, tierCounts, issueKeys }
}

function priorityLabel(priority: string): string {
  const value = priority.match(/^P([0-3])\b/)
  invariant(value, `Unknown priority ${priority}`)
  return `priority:p${value[1]}`
}

function categoryLabel(category: string): string {
  return `category:${category === "Developer" ? "developer" : category.toLowerCase()}`
}

function statusLabel(workflow: string): string | null {
  if (workflow === "Ready") return "status:ready"
  if (workflow === "Blocked") return "status:blocked"
  if (workflow === "Device QA") return "status:device-qa"
  if (workflow === "Backlog") return "status:triage"
  return null
}

function labelsFor(item: WorkItemDefinition): string[] {
  const labels = [
    `type:${item.type.toLowerCase()}`,
    priorityLabel(item.priority),
    categoryLabel(item.category),
  ]
  const workflowLabel = statusLabel(item.workflow)
  if (workflowLabel) labels.push(workflowLabel)
  if (item.risk === "High") labels.push("risk:high")
  if (item.risk === "Critical") labels.push("risk:critical")
  if (item.tier) labels.push(`tier:${item.tier}`)
  if (item.verticalSlice) labels.push("scope:vertical-slice")
  return [...new Set(labels)]
}

function checklist(lines: string[]): string {
  return lines.map((line) => `- [ ] ${line}`).join("\n")
}

function bodyFor(item: WorkItemDefinition): string {
  const marker = `<!-- yash-tools-work-item:${item.key} -->`
  const endMarker = "<!-- /yash-tools-work-item -->"
  const metadata = [
    `- Work type: ${item.type}`,
    `- Priority: ${item.priority}`,
    `- Phase: ${item.phase}`,
    `- Category: ${item.category}`,
    `- Risk: ${item.risk}`,
    `- Estimate: ${item.estimate} relative points`,
  ]
  if (item.tier) metadata.push(`- Migration tier: ${item.tier}`)
  if (item.toolId) metadata.push(`- Stable tool ID: \`${item.toolId}\``)
  if (item.verticalSlice) metadata.push("- Architecture milestone: yes")

  if (item.type === "Tool") {
    return `${marker}

## Outcome

Implement **${item.title.replace("[Tool] ", "")}** as an offline-first Android production tool using the shared platform contracts and the audited source behavior.

## Planning metadata

${metadata.join("\n")}

## Source and provenance

- Audited upstream commit: \`${manifest.auditedUpstreamCommit}\`
- Upstream catalog ID: \`${item.toolId}\`
- Inspect the matching implementation under \`/home/yash/Desktop/yash/portfolio-v2/components/tools/\` as read-only reference.
- Record every copied algorithm, dataset, fixture, dependency, or asset in \`docs/SOURCE_PROVENANCE.md\`.
- Establish an independent correctness oracle before copying UI logic.

## Mandatory acceptance

${checklist([
  "Extract and verify reusable pure logic with golden, boundary, malformed, and representative fixtures.",
  "Use platform contracts only; do not directly import Capacitor, call localStorage, open browser windows, or create hidden downloads.",
  "Classify offline/network, permissions, persistence, sensitive data, files, MIME/encoding, cleanup, lifecycle, and recovery behavior.",
  "Enforce visible input, output, size, time, memory, allocation, and cancellation limits before expensive work.",
  "Implement all applicable initial, empty, editing, invalid, loading, success, cancelled, offline, denied, unsupported, over-limit, interrupted, and recovery states.",
  "Adapt phones, tablets, portrait, landscape, split-screen, keyboards, IME, Back, rotation, pause/resume, and process recreation.",
  "Verify visible labels, focus order, TalkBack, Switch Access, 48 dp targets, 200% text, contrast, reduced motion, and non-color cues.",
  "Add pure logic, component, relevant adapter/native, E2E, and bundled Android artifact tests.",
  "Record physical-device evidence with device/API/WebView and artifact hash.",
  "Reconcile dependency/license/attribution, privacy/Data Safety, help/store claims, registry status, release manifest, and tracker evidence.",
  "Never persist input unless explicitly required and approved; never log private or sensitive content or filenames.",
])}

## Dependencies

Use the GitHub dependency relationships on this issue as the authoritative blocking graph. Do not bypass a blocker by weakening tests, limits, permissions, privacy, accessibility, or policy requirements.

## Definition of Done

This issue closes only when every applicable item in \`AGENT.md\` Section 26 passes. Compilation, browser-only behavior, or visual completion is insufficient.

${endMarker}`
  }

  invariant(item.outcome, `${item.key} must define an outcome`)
  invariant(item.acceptance, `${item.key} must define acceptance criteria`)

  return `${marker}

## Outcome

${item.outcome}

## Planning metadata

${metadata.join("\n")}

## Acceptance criteria

${checklist(item.acceptance)}

## Evidence and controls

- Link the implementation pull request using \`Closes #<issue>\`.
- Record commands, exact results, device/API/WebView details, and artifact hashes without private user data.
- Update the tracker, ADRs, provenance, permission/data inventories, and release documentation when applicable.
- Never include credentials, signing material, clipboard values, tool inputs, notes, file contents, sensitive filenames, or real user data.

## Completion rule

Close only when the stated outcome and every applicable repository acceptance gate pass. A partial implementation remains open or is split into linked sub-issues.

${endMarker}`
}

function issueDefinitions(): WorkItemDefinition[] {
  const epics: WorkItemDefinition[] = manifest.epics.map((item) => ({
    ...item,
    type: "Epic",
  }))
  const tasks: WorkItemDefinition[] = manifest.tasks.map((item) => ({ ...item }))
  const tools: WorkItemDefinition[] = manifest.tools.map(([id, label, category]) => {
    const tier = tierFor(id)
    const verticalSlice = manifest.verticalSlice.includes(id)
    const implemented = manifest.implementedTools.includes(id)
    const phase = verticalSlice
      ? "12-Tool Milestone"
      : tier === 1
        ? "Tier 1 Migration"
        : "Adapter/Network/Special"
    const milestone = verticalSlice ? "vertical-slice" : tier === 1 ? "tier-1" : "heavy-tools"
    const risk = tier === 4 ? "Critical" : tier >= 2 ? "High" : "Medium"
    const estimate = implemented ? 2 : tier === 1 ? 3 : tier === 2 ? 5 : tier === 3 ? 5 : 8

    return {
      key: `tool:${id}`,
      title: `[Tool] ${label}`,
      parent: categoryEpics[category],
      type: "Tool" as const,
      category: categoryNames[category],
      phase,
      priority: verticalSlice ? "P0 Critical" : tier >= 3 ? "P1 High" : "P2 Normal",
      risk,
      estimate,
      workflow: implemented ? "Device QA" : "Backlog",
      milestone,
      tier,
      verticalSlice,
      toolId: id,
      blockedBy: manifest.toolDependencies[id] ?? [],
    }
  })
  return [...epics, ...tasks, ...tools]
}

function validateDefinitions(definitions: WorkItemDefinition[]): void {
  const fields = new Map(manifest.project.fields.map((field) => [field.name, field]))
  const requiredFields = [
    "Workflow",
    "Work Type",
    "Priority",
    "Phase",
    "Category",
    "Risk",
    "Estimate",
  ]
  for (const name of requiredFields) invariant(fields.has(name), `Missing Project field ${name}`)

  for (const definition of definitions) {
    invariant(definition.title.trim().length > 0, `${definition.key} must have a title`)
    invariant(
      Number.isInteger(definition.estimate) &&
        (definition.type === "Epic" ? definition.estimate === 0 : definition.estimate > 0),
      `${definition.key} must have a positive integer estimate (or zero for an epic)`,
    )
    const values: Record<string, string | number> = {
      Workflow: definition.workflow,
      "Work Type": definition.type,
      Priority: definition.priority,
      Phase: definition.phase,
      Category: definition.category,
      Risk: definition.risk,
      Estimate: definition.estimate,
    }
    for (const [name, value] of Object.entries(values)) {
      const field = fields.get(name)
      invariant(field, `Missing Project field ${name}`)
      if (field.type === "NUMBER") {
        invariant(typeof value === "number", `${definition.key} has non-numeric ${name}`)
      } else {
        invariant(
          field.options?.includes(String(value)),
          `${definition.key} uses unknown ${name} option ${String(value)}`,
        )
      }
    }
  }
}

function runGh(
  args: string[],
  { input, allowFailure = false }: CommandOptions = {},
): CommandResult {
  const result = spawnSync(ghBinary, args, {
    cwd: root,
    encoding: "utf8",
    input,
    maxBuffer: 20 * 1024 * 1024,
    env: process.env,
  })
  if (result.error) throw result.error
  if (result.status !== 0 && !allowFailure) {
    const detail = (result.stderr || result.stdout || `exit ${result.status}`).trim()
    throw new Error(`gh ${args.slice(0, 3).join(" ")} failed: ${detail}`)
  }
  invariant(result.status !== null, `gh ${args.slice(0, 3).join(" ")} did not report a status`)
  return { status: result.status, stdout: result.stdout.trim(), stderr: result.stderr.trim() }
}

function ghJson<T>(args: string[], options?: CommandOptions): T | null {
  const result = runGh(args, options)
  if (result.status !== 0 || result.stdout.length === 0) return null
  return JSON.parse(result.stdout) as T
}

function api<T>(
  method: string,
  endpoint: string,
  payload?: unknown,
  { allowFailure = false }: Pick<CommandOptions, "allowFailure"> = {},
): T | null {
  const args = ["api", "--method", method, "-H", `X-GitHub-Api-Version: ${apiVersion}`, endpoint]
  if (payload !== undefined) args.push("--input", "-")
  const input = payload === undefined ? undefined : JSON.stringify(payload)

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = runGh(args, { input, allowFailure: true })
    if (result.status === 0) {
      return result.stdout.length === 0 ? null : (JSON.parse(result.stdout) as T)
    }

    const detail = result.stderr || result.stdout || `exit ${result.status}`
    const retryable = /secondary rate limit|abuse|temporarily unavailable|HTTP 429/i.test(detail)
    if (retryable && attempt < 4) {
      const delay = 5_000 * 2 ** attempt
      console.warn(`GitHub API requested backoff; retrying in ${delay / 1_000}s.`)
      pause(delay)
      continue
    }
    if (allowFailure) return null
    throw new Error(`GitHub API ${method} ${endpoint} failed: ${detail.trim()}`)
  }

  throw new Error(`GitHub API ${method} ${endpoint} exhausted retries`)
}

function paginated<T>(endpoint: string): T[] {
  const value = ghJson<T[][]>([
    "api",
    "--paginate",
    "--slurp",
    "-H",
    `X-GitHub-Api-Version: ${apiVersion}`,
    endpoint,
  ])
  return Array.isArray(value) ? value.flat() : []
}

function pause(milliseconds: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds)
}

function provisionLabels(repository: string): void {
  console.log(`Provisioning ${manifest.labels.length} labels...`)
  for (const label of manifest.labels) {
    runGh([
      "label",
      "create",
      label.name,
      "--repo",
      repository,
      "--color",
      label.color,
      "--description",
      label.description,
      "--force",
    ])
  }
}

function provisionMilestones(repository: string): Map<string, GitHubMilestone> {
  console.log(`Provisioning ${manifest.milestones.length} milestones...`)
  const existing = paginated<GitHubMilestone>(
    `repos/${repository}/milestones?state=all&per_page=100`,
  )
  const byTitle = new Map(existing.map((milestone) => [milestone.title, milestone]))
  const result = new Map<string, GitHubMilestone>()

  for (const definition of manifest.milestones) {
    let milestone = byTitle.get(definition.title)
    if (!milestone) {
      const created = api<GitHubMilestone>("POST", `repos/${repository}/milestones`, {
        title: definition.title,
        description: definition.description,
      })
      invariant(created, `Milestone ${definition.key} was not returned by GitHub`)
      milestone = created
      pause(250)
    } else if (milestone.description !== definition.description || milestone.state !== "open") {
      const updated = api<GitHubMilestone>(
        "PATCH",
        `repos/${repository}/milestones/${milestone.number}`,
        {
          description: definition.description,
          state: "open",
        },
      )
      invariant(updated, `Milestone ${definition.key} was not returned by GitHub`)
      milestone = updated
    }
    invariant(milestone, `Milestone ${definition.key} was not returned by GitHub`)
    result.set(definition.key, milestone)
  }
  return result
}

function markerKey(body: string | null): string | null {
  return body?.match(/<!-- yash-tools-work-item:([^ ]+) -->/)?.[1] ?? null
}

function reconciledIssueBody(currentBody: string | null, desiredBody: string): string {
  if (!currentBody) return desiredBody

  const completed = new Set(
    [...currentBody.matchAll(/^- \[[xX]\] (.+)$/gm)].map((match) => match[1]),
  )
  const withCompletedChecks = desiredBody.replace(/^- \[ \] (.+)$/gm, (line, text: string) =>
    completed.has(text) ? `- [x] ${text}` : line,
  )
  const start = currentBody.search(/<!-- yash-tools-work-item:[^ ]+ -->/)
  const endMarker = "<!-- /yash-tools-work-item -->"
  const end = currentBody.indexOf(endMarker, start)
  if (start < 0 || end < 0) return withCompletedChecks

  return `${currentBody.slice(0, start)}${withCompletedChecks}${currentBody.slice(end + endMarker.length)}`
}

function issueLabelNames(issue: GitHubIssue): string[] {
  return issue.labels.map((label) => (typeof label === "string" ? label : label.name))
}

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const sortedLeft = [...left].sort()
  const sortedRight = [...right].sort()
  return sortedLeft.every((value, index) => value === sortedRight[index])
}

function issueNumberFromApiUrl(url: string): number {
  const value = Number(url.match(/\/issues\/(\d+)$/)?.[1])
  invariant(Number.isInteger(value) && value > 0, `Invalid GitHub issue URL: ${url}`)
  return value
}

function provisionIssues(
  repository: string,
  definitions: WorkItemDefinition[],
  milestones: Map<string, GitHubMilestone>,
): Map<string, GitHubIssue> {
  console.log(`Provisioning ${definitions.length} issues...`)
  const existing = paginated<GitHubIssue>(
    `repos/${repository}/issues?state=all&per_page=100`,
  ).filter((issue) => !issue.pull_request)
  const byKey = new Map<string, GitHubIssue>()
  const definitionKeys = new Set(definitions.map(({ key }) => key))
  for (const issue of existing) {
    const key = markerKey(issue.body)
    if (key) {
      invariant(definitionKeys.has(key), `GitHub issue #${issue.number} has unknown marker ${key}`)
      invariant(!byKey.has(key), `Multiple GitHub issues use work-item marker ${key}`)
      byKey.set(key, issue)
    }
  }

  let created = 0
  let updated = 0
  let reparented = 0
  const managedLabels = new Set(manifest.labels.map(({ name }) => name))
  for (const definition of definitions) {
    const parent = definition.parent ? byKey.get(definition.parent) : null
    invariant(
      !definition.parent || parent,
      `${definition.key} parent was not created: ${definition.parent}`,
    )
    const milestone = definition.milestone ? milestones.get(definition.milestone) : null
    invariant(!definition.milestone || milestone, `${definition.key} milestone missing`)
    let issue = byKey.get(definition.key)
    if (!issue) {
      const createdIssue = api<GitHubIssue>("POST", `repos/${repository}/issues`, {
        title: definition.title,
        body: bodyFor(definition),
        labels: labelsFor(definition),
        milestone: milestone?.number,
        parent_issue_id: parent?.id,
      })
      invariant(createdIssue, `Issue ${definition.key} was not returned by GitHub`)
      issue = createdIssue
      byKey.set(definition.key, issue)
      created += 1
      if (created % 10 === 0) console.log(`  created ${created} new issues`)
      pause(450)
      continue
    }

    const desiredBody = reconciledIssueBody(issue.body, bodyFor(definition))
    const desiredManagedLabels = labelsFor(definition)
    const unmanagedLabels = issueLabelNames(issue).filter((label) => !managedLabels.has(label))
    const desiredLabels = [...new Set([...unmanagedLabels, ...desiredManagedLabels])]
    const patch: Record<string, unknown> = {}
    if (issue.title !== definition.title) patch.title = definition.title
    if (issue.body !== desiredBody) patch.body = desiredBody
    if (!sameStringSet(issueLabelNames(issue), desiredLabels)) patch.labels = desiredLabels
    if ((issue.milestone?.number ?? null) !== (milestone?.number ?? null)) {
      patch.milestone = milestone?.number ?? null
    }
    if (Object.keys(patch).length > 0) {
      const reconciled = api<GitHubIssue>(
        "PATCH",
        `repos/${repository}/issues/${issue.number}`,
        patch,
      )
      invariant(reconciled, `Updated issue ${definition.key} was not returned by GitHub`)
      issue = reconciled
      byKey.set(definition.key, issue)
      updated += 1
      pause(250)
    }

    const desiredParentUrl = parent
      ? `https://api.github.com/repos/${repository}/issues/${parent.number}`
      : null
    const currentParentUrl = issue.parent_issue_url ?? null
    if (currentParentUrl !== desiredParentUrl) {
      if (parent) {
        api("POST", `repos/${repository}/issues/${parent.number}/sub_issues`, {
          sub_issue_id: issue.id,
          replace_parent: true,
        })
      } else {
        invariant(currentParentUrl, `${definition.key} has no parent to remove`)
        api(
          "DELETE",
          `repos/${repository}/issues/${issueNumberFromApiUrl(currentParentUrl)}/sub_issue`,
          { sub_issue_id: issue.id },
        )
      }
      reparented += 1
      pause(300)
    }
  }

  console.log(
    `Issues ready: ${byKey.size} marked items (${created} created, ${updated} updated, ${reparented} reparented in this run).`,
  )
  return byKey
}

function provisionDependencies(
  repository: string,
  definitions: WorkItemDefinition[],
  issues: Map<string, GitHubIssue>,
): void {
  console.log("Provisioning issue dependencies...")
  let created = 0
  let removed = 0
  for (const definition of definitions) {
    const target = issues.get(definition.key)
    invariant(target, `Missing target issue ${definition.key}`)
    const blockers = definition.blockedBy ?? []
    const existing = api<GitHubIssue[]>(
      "GET",
      `repos/${repository}/issues/${target.number}/dependencies/blocked_by?per_page=100`,
    )
    invariant(existing, `Dependencies for ${definition.key} were not returned by GitHub`)
    const existingIds = new Set(existing.map((issue) => issue.id))
    const desiredIds = new Set(
      blockers.map((blockerKey) => {
        const blocker = issues.get(blockerKey)
        invariant(blocker, `Missing blocking issue ${blockerKey}`)
        return blocker.id
      }),
    )
    for (const dependency of existing) {
      if (desiredIds.has(dependency.id)) continue
      api(
        "DELETE",
        `repos/${repository}/issues/${target.number}/dependencies/blocked_by/${dependency.id}`,
      )
      existingIds.delete(dependency.id)
      removed += 1
      pause(300)
    }
    for (const blockerKey of blockers) {
      const blocker = issues.get(blockerKey)
      invariant(blocker, `Missing blocking issue ${blockerKey}`)
      if (existingIds.has(blocker.id)) continue
      api("POST", `repos/${repository}/issues/${target.number}/dependencies/blocked_by`, {
        issue_id: blocker.id,
      })
      existingIds.add(blocker.id)
      created += 1
      pause(300)
    }
  }
  console.log(`Dependencies ready (${created} created, ${removed} removed in this run).`)
}

function provisionProject(repository: string): ManagedProject {
  const owner = repository.split("/")[0]
  invariant(owner, `Repository ${repository} has no owner`)
  const projectsValue = ghJson<{ projects: ProjectSummary[] } | ProjectSummary[]>([
    "project",
    "list",
    "--owner",
    owner,
    "--limit",
    "100",
    "--format",
    "json",
  ])
  const projects = Array.isArray(projectsValue) ? projectsValue : (projectsValue?.projects ?? [])
  let project = projects.find(({ title }) => title === manifest.project.title)

  if (!project) {
    console.log("Creating GitHub Project...")
    const created = ghJson<ProjectSummary>([
      "project",
      "create",
      "--owner",
      owner,
      "--title",
      manifest.project.title,
      "--format",
      "json",
    ])
    invariant(created, "GitHub did not return the created project")
    project = created
  }

  invariant(project, "GitHub did not return the created project")
  runGh([
    "project",
    "edit",
    String(project.number),
    "--owner",
    owner,
    "--title",
    manifest.project.title,
    "--description",
    manifest.project.description,
    "--readme",
    manifest.project.readme,
    "--visibility",
    manifest.project.visibility,
  ])

  const link = runGh(
    ["project", "link", String(project.number), "--owner", owner, "--repo", repository],
    { allowFailure: true },
  )
  if (link.status !== 0 && !/already|linked/i.test(`${link.stdout}\n${link.stderr}`)) {
    throw new Error(`Unable to link project to repository: ${link.stderr || link.stdout}`)
  }

  return { ...project, owner }
}

function provisionProjectFields(project: ManagedProject): ProjectField[] {
  console.log(`Provisioning ${manifest.project.fields.length} project fields...`)
  let value = ghJson<{ fields: ProjectField[] } | ProjectField[]>([
    "project",
    "field-list",
    String(project.number),
    "--owner",
    project.owner,
    "--limit",
    "100",
    "--format",
    "json",
  ])
  let fields = Array.isArray(value) ? value : (value?.fields ?? [])
  const names = new Set(fields.map(({ name }) => name))

  for (const field of manifest.project.fields) {
    if (names.has(field.name)) continue
    const args = [
      "project",
      "field-create",
      String(project.number),
      "--owner",
      project.owner,
      "--name",
      field.name,
      "--data-type",
      field.type,
      "--format",
      "json",
    ]
    if (field.options) args.push("--single-select-options", field.options.join(","))
    runGh(args)
  }

  value = ghJson<{ fields: ProjectField[] } | ProjectField[]>([
    "project",
    "field-list",
    String(project.number),
    "--owner",
    project.owner,
    "--limit",
    "100",
    "--format",
    "json",
  ])
  fields = Array.isArray(value) ? value : (value?.fields ?? [])
  for (const definition of manifest.project.fields) {
    const field = fields.find(({ name }) => name === definition.name)
    invariant(field, `Project field missing after provisioning: ${definition.name}`)
    if (definition.type === "SINGLE_SELECT") {
      invariant(
        field.type === "ProjectV2SingleSelectField",
        `Project field ${definition.name} is not single-select`,
      )
      const actualOptions = new Set(field.options?.map(({ name }) => name) ?? [])
      for (const option of definition.options ?? []) {
        invariant(
          actualOptions.has(option),
          `Project field ${definition.name} is missing option ${option}; recreate the field or add the option in GitHub before rerunning`,
        )
      }
    } else {
      invariant(
        field.type === "ProjectV2Field",
        `Project field ${definition.name} is not a number field`,
      )
    }
  }
  return fields
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function graphQl<T>(query: string): T {
  const args = ["api", "graphql", "-f", `query=${query}`]
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = runGh(args, { allowFailure: true })
    if (result.status === 0) {
      invariant(result.stdout, "GitHub GraphQL returned no response")
      return JSON.parse(result.stdout) as T
    }

    const detail = result.stderr || result.stdout || `exit ${result.status}`
    const retryable =
      /something went wrong|secondary rate limit|temporarily unavailable|HTTP 429/i.test(detail)
    if (retryable && attempt < 4) {
      const delay = 5_000 * 2 ** attempt
      console.warn(`GitHub GraphQL requested backoff; retrying in ${delay / 1_000}s.`)
      pause(delay)
      continue
    }
    throw new Error(`GitHub GraphQL failed: ${detail.trim()}`)
  }

  throw new Error("GitHub GraphQL exhausted retries")
}

function projectItems(project: ManagedProject): ProjectItem[] {
  const value = ghJson<{ items: ProjectItem[] } | ProjectItem[]>([
    "project",
    "item-list",
    String(project.number),
    "--owner",
    project.owner,
    "--limit",
    "1000",
    "--format",
    "json",
  ])
  return Array.isArray(value) ? value : (value?.items ?? [])
}

function addProjectItems(
  project: ManagedProject,
  issues: Map<string, GitHubIssue>,
): Map<string, string> {
  console.log("Adding issues to the GitHub Project...")
  const existingByUrl = new Map<string, string>()
  for (const item of projectItems(project)) {
    const url = item.content?.url
    if (url) existingByUrl.set(url, item.id)
  }
  const missing = [...issues.values()].filter((issue) => !existingByUrl.has(issue.html_url))

  for (const batch of chunks(missing, 5)) {
    const operations = batch
      .map(
        (issue, index) =>
          `a${index}: addProjectV2ItemById(input: {projectId: ${JSON.stringify(project.id)}, contentId: ${JSON.stringify(issue.node_id)}}) { item { id } }`,
      )
      .join("\n")
    const result = graphQl<{
      data: Record<string, { item: { id: string } }>
    }>(`mutation {\n${operations}\n}`)
    batch.forEach((issue, index) =>
      existingByUrl.set(issue.html_url, result.data[`a${index}`].item.id),
    )
  }

  console.log(`Project membership ready (${missing.length} items added in this run).`)
  return existingByUrl
}

function fieldValue(field: ProjectField, value: string | number): string {
  if (field.type === "ProjectV2Field" || field.dataType === "NUMBER") {
    return `{number: ${Number(value)}}`
  }
  const option = field.options?.find(({ name }) => name === value)
  invariant(option, `Field ${field.name} has no option ${value}`)
  return `{singleSelectOptionId: ${JSON.stringify(option.id)}}`
}

function setProjectFields(
  project: ManagedProject,
  fields: ProjectField[],
  definitions: WorkItemDefinition[],
  issues: Map<string, GitHubIssue>,
  projectItemIds: Map<string, string>,
): void {
  console.log("Applying structured Project field values...")
  const fieldByName = new Map(fields.map((field) => [field.name, field]))
  const updates: { itemId: string; field: ProjectField; value: string | number }[] = []

  for (const definition of definitions) {
    const issue = issues.get(definition.key)
    invariant(issue, `Missing issue for ${definition.key}`)
    const itemId = projectItemIds.get(issue.html_url)
    invariant(itemId, `Missing project item for ${definition.key}`)
    const values = {
      Workflow: issue.state === "closed" ? "Done" : definition.workflow,
      "Work Type": definition.type,
      Priority: definition.priority,
      Phase: definition.phase,
      Category: definition.category,
      Risk: definition.risk,
      Estimate: definition.estimate,
    }

    for (const [fieldName, value] of Object.entries(values)) {
      const field = fieldByName.get(fieldName)
      invariant(field, `Project field missing: ${fieldName}`)
      updates.push({ itemId, field, value })
    }
  }

  for (const batch of chunks(updates, 25)) {
    const operations = batch
      .map(
        ({ itemId, field, value }, index) =>
          `u${index}: updateProjectV2ItemFieldValue(input: {projectId: ${JSON.stringify(project.id)}, itemId: ${JSON.stringify(itemId)}, fieldId: ${JSON.stringify(field.id)}, value: ${fieldValue(field, value)}}) { projectV2Item { id } }`,
      )
      .join("\n")
    graphQl(`mutation {\n${operations}\n}`)
  }
  console.log(`Project fields ready (${updates.length} values reconciled).`)
}

function linkSafPullRequest(
  repository: string,
  project: ManagedProject,
  fields: ProjectField[],
  issues: Map<string, GitHubIssue>,
): void {
  const workItem = issues.get("land-document-saf-pr")
  invariant(workItem, "Missing work item land-document-saf-pr")
  const pull = ghJson<PullRequest>([
    "pr",
    "view",
    "1",
    "--repo",
    repository,
    "--json",
    "id,url,title,body,state,mergedAt",
  ])
  invariant(pull, "Pull request #1 was not returned by GitHub")
  const closingText = `Closes #${workItem.number}`
  const currentBody = pull.body ?? ""
  if (!currentBody.includes(closingText)) {
    runGh([
      "pr",
      "edit",
      "1",
      "--repo",
      repository,
      "--body",
      `${currentBody.trim()}\n\n${closingText}`,
    ])
  }

  const currentItems = projectItems(project)
  let item = currentItems.find((candidate) => candidate.content?.url === pull.url)
  if (!item) {
    const added = ghJson<ProjectItem>([
      "project",
      "item-add",
      String(project.number),
      "--owner",
      project.owner,
      "--url",
      pull.url,
      "--format",
      "json",
    ])
    invariant(added, "GitHub did not return the project item for pull request #1")
    item = added
  }

  invariant(item, "GitHub did not return the project item for pull request #1")
  const fieldByName = new Map(fields.map((field) => [field.name, field]))
  const values = {
    Workflow: pull.state === "OPEN" ? "In Review" : "Done",
    "Work Type": "Foundation",
    Priority: "P0 Critical",
    Phase: "Foundation",
    Category: "Platform",
    Risk: "High",
    Estimate: 2,
  }
  const operations = Object.entries(values)
    .map(([name, value], index) => {
      const field = fieldByName.get(name)
      invariant(field, `Project field missing: ${name}`)
      return `p${index}: updateProjectV2ItemFieldValue(input: {projectId: ${JSON.stringify(project.id)}, itemId: ${JSON.stringify(item.id)}, fieldId: ${JSON.stringify(field.id)}, value: ${fieldValue(field, value)}}) { projectV2Item { id } }`
    })
    .join("\n")
  graphQl(`mutation {\n${operations}\n}`)
}

const validation = validateManifest()
const definitions = issueDefinitions()
validateDefinitions(definitions)
console.log(
  `Manifest valid: ${manifest.tools.length} tools (${validation.tierCounts.join("/")} by tier), ${manifest.epics.length} epics, ${manifest.tasks.length} launch tasks, ${definitions.length} total issues.`,
)

if (!apply) {
  console.log(
    "Dry run complete. Pass --apply with an authenticated GitHub CLI to provision remote state.",
  )
  process.exit(0)
}

runGh(["auth", "status", "--hostname", "github.com"])
provisionLabels(manifest.repository)
const milestones = provisionMilestones(manifest.repository)
const issues = provisionIssues(manifest.repository, definitions, milestones)
provisionDependencies(manifest.repository, definitions, issues)
const project = provisionProject(manifest.repository)
const fields = provisionProjectFields(project)
const itemIds = addProjectItems(project, issues)
setProjectFields(project, fields, definitions, issues, itemIds)
linkSafPullRequest(manifest.repository, project, fields, issues)

const rootLaunchEpic = issues.get("launch-v1")
invariant(rootLaunchEpic, "Missing root launch epic after provisioning")
console.log(`Project: ${project.url}`)
console.log(`Root launch epic: ${rootLaunchEpic.html_url}`)
console.log(`Repository issues: https://github.com/${manifest.repository}/issues`)
console.log("GitHub work-management provisioning complete.")
