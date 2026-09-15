import type { ComponentType, LazyExoticComponent } from "react"
import type { LucideIcon } from "lucide-react"

export type ToolCategoryId = "core" | "dev" | "text" | "media"
/**
 * Tool lifecycle, per section 10 of the repository guide.
 *
 * `removed` is a terminal state for a tool that is no longer part of the released
 * scope but whose identifier stays bound to its current meaning. ADR 0023 moves the
 * 70 cut tools here; their source, pure logic, provenance, and tests stay in-tree and
 * only the lazy component is dropped, so a reversal is a manifest edit rather than a
 * re-implementation. Tool IDs are persistent external identifiers and are never
 * reused for a different function.
 */
export type ToolStatus = "enabled" | "planned" | "experimental" | "deprecated" | "removed"
export type ToolRisk = "low" | "medium" | "high"

export interface ToolDefinition {
  id: string
  label: string
  description: string
  category: ToolCategoryId
  tags: readonly string[]
  icon: LucideIcon
  status: ToolStatus
  risk: ToolRisk
  network: boolean
  persistent: boolean
  component?: LazyExoticComponent<ComponentType>
}

export interface ToolCategory {
  id: ToolCategoryId
  label: string
}
