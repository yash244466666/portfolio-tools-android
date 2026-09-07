import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  addSourceTag,
  buildCspHeader,
  commonSources,
  defaultDirectives,
  type CspDirective,
} from "./csp"

export default function CspGenerator() {
  const [directives, setDirectives] = useState<CspDirective[]>(defaultDirectives)
  const [status, setStatus] = useState("")

  const header = buildCspHeader(directives)

  function toggleDirective(id: string) {
    setDirectives((previous) =>
      previous.map((directive) =>
        directive.id === id ? { ...directive, enabled: !directive.enabled } : directive,
      ),
    )
  }

  function updateSources(id: string, sources: string) {
    setDirectives((previous) =>
      previous.map((directive) => (directive.id === id ? { ...directive, sources } : directive)),
    )
  }

  function addTag(id: string, tag: string) {
    setDirectives((previous) =>
      previous.map((directive) =>
        directive.id === id
          ? { ...directive, sources: addSourceTag(directive.sources, tag) }
          : directive,
      ),
    )
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Directives">
        <div className="grid gap-2">
          {directives.map((directive) => (
            <div className="rounded-2xl border border-[var(--border)] p-3" key={directive.id}>
              <label className="flex min-h-8 items-center gap-3">
                <input
                  checked={directive.enabled}
                  className="h-5 w-5 accent-[var(--primary)]"
                  onChange={() => toggleDirective(directive.id)}
                  type="checkbox"
                  aria-label={`Enable ${directive.label}`}
                />
                <span className="font-mono text-sm font-semibold">{directive.label}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {directive.description}
                </span>
              </label>
              {directive.enabled && !directive.flagOnly ? (
                <div className="mt-2 ml-8 grid gap-2">
                  <input
                    aria-label={`Sources for ${directive.label}`}
                    className="app-input font-mono text-sm"
                    id={`csp-${directive.id}`}
                    onChange={(event) => updateSources(directive.id, event.target.value)}
                    placeholder="e.g. 'self' https://cdn.example.com"
                    value={directive.sources}
                  />
                  <div className="flex flex-wrap gap-2">
                    {commonSources.map((tag) => (
                      <Button
                        aria-label={`Add ${tag} to ${directive.label}`}
                        key={tag}
                        onClick={() => addTag(directive.id, tag)}
                        variant="secondary"
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy" onStatus={setStatus} value={header} />}
        title="Content-Security-Policy"
      >
        {header ? (
          <p className="break-all font-mono text-sm">{header}</p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Enable directives above to build a policy.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          The header is only a draft; test it with the report-only mode first. A policy is not a
          substitute for escaping untrusted content.
        </p>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
