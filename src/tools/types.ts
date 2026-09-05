import type { ComponentType, LazyExoticComponent } from "react"
import type { LucideIcon } from "lucide-react"

export type ToolCategoryId = "core" | "dev" | "text" | "media"
export type ToolStatus = "enabled" | "planned" | "experimental" | "deprecated"
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
