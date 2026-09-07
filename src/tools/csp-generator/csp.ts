export interface CspDirective {
  id: string
  label: string
  description: string
  /** Flag-only directives carry no source list (upgrade-insecure-requests). */
  flagOnly: boolean
  enabled: boolean
  sources: string
}

export const commonSources = ["'self'", "'none'", "'unsafe-inline'", "'unsafe-eval'", "*"] as const

const directiveDefaults: readonly {
  id: string
  label: string
  description: string
  flagOnly?: boolean
  sources?: string
}[] = [
  {
    id: "default-src",
    label: "default-src",
    description: "Fallback for other directives",
    sources: "'self'",
  },
  { id: "script-src", label: "script-src", description: "JavaScript sources" },
  { id: "style-src", label: "style-src", description: "CSS sources" },
  { id: "img-src", label: "img-src", description: "Image sources" },
  { id: "font-src", label: "font-src", description: "Font sources" },
  { id: "connect-src", label: "connect-src", description: "Fetch, XHR, WebSocket sources" },
  { id: "media-src", label: "media-src", description: "Audio & video sources" },
  {
    id: "object-src",
    label: "object-src",
    description: "Object & embed sources",
    sources: "'none'",
  },
  { id: "frame-src", label: "frame-src", description: "Iframe sources" },
  { id: "base-uri", label: "base-uri", description: "Restrict <base> element", sources: "'self'" },
  {
    id: "form-action",
    label: "form-action",
    description: "Form submission targets",
    sources: "'self'",
  },
  {
    id: "frame-ancestors",
    label: "frame-ancestors",
    description: "Who can embed this page",
    sources: "'none'",
  },
  {
    id: "upgrade-insecure-requests",
    label: "upgrade-insecure-requests",
    description: "Upgrade HTTP to HTTPS",
    flagOnly: true,
  },
]

export function defaultDirectives(): CspDirective[] {
  return directiveDefaults.map((directive) => ({
    id: directive.id,
    label: directive.label,
    description: directive.description,
    flagOnly: directive.flagOnly ?? false,
    enabled: directive.id === "default-src",
    sources: directive.sources ?? "",
  }))
}

/**
 * Joins enabled directives into a header value. An enabled directive with no
 * sources falls back to `'none'` (except flag-only directives); the upstream
 * also emitted a bare `default-src 'none'`-less header when all boxes were
 * unchecked — an empty policy here is represented explicitly instead.
 */
export function buildCspHeader(directives: readonly CspDirective[]): string {
  const parts = directives
    .filter((directive) => directive.enabled)
    .map((directive) => {
      if (directive.flagOnly) return directive.id
      return `${directive.id} ${directive.sources.trim() || "'none'"}`
    })
  return parts.join("; ")
}

export function addSourceTag(sources: string, tag: string): string {
  const current = sources.split(" ").filter(Boolean)
  if (current.includes(tag)) return sources
  return [...current, tag].join(" ")
}
