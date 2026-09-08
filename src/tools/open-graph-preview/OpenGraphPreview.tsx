import { useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildOpenGraphSummary,
  maximumOgHtmlLength,
  parseOpenGraphTags,
  serializeOpenGraphTags,
} from "./og"

const limitLabel = maximumOgHtmlLength.toLocaleString("en-US")

const summaryRows: Array<{ key: keyof ReturnType<typeof buildOpenGraphSummary>; label: string }> = [
  { key: "title", label: "Title" },
  { key: "description", label: "Description" },
  { key: "imageUrl", label: "Image URL" },
  { key: "url", label: "Canonical URL" },
  { key: "type", label: "Type" },
  { key: "card", label: "Twitter card" },
]

export default function OpenGraphPreview() {
  const [html, setHtml] = useState("")
  const [status, setStatus] = useState("")

  const tags = useMemo(() => parseOpenGraphTags(html), [html])
  const summary = useMemo(() => buildOpenGraphSummary(tags), [tags])
  const hasTags = tags.length > 0

  return (
    <div className="grid gap-4">
      <ToolPanel title="Paste page head">
        <Field
          hint={`HTML head content up to ${limitLabel} characters. Meta tags using property= or name= with og: or twitter: prefixes are recognized.`}
          htmlFor="open-graph-preview-input"
          label="HTML input"
        >
          <textarea
            className="app-input min-h-48 font-mono"
            id="open-graph-preview-input"
            onChange={(event) => setHtml(event.target.value)}
            placeholder={'<meta property="og:title" content="…" />'}
            spellCheck={false}
            value={html}
          />
        </Field>
      </ToolPanel>

      {html.trim() === "" ? (
        <ToolPanel title="Preview">
          <p className="text-sm text-[var(--text-secondary)]">
            Paste the head section of a page above to inspect its social cards.
          </p>
        </ToolPanel>
      ) : hasTags ? (
        <>
          <ToolPanel title="Preview" action={<CopyButton label="Copy tags" onStatus={setStatus} value={serializeOpenGraphTags(tags)} />}>
            <dl className="grid gap-3">
              {summaryRows.map((row) => (
                <div key={row.key} className="grid gap-1">
                  <dt className="text-sm font-medium">{row.label}</dt>
                  <dd className="break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
                    {summary[row.key] === "" ? "Not set" : summary[row.key]}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
              {tags.length} tag{tags.length === 1 ? "" : "s"} found. The image is shown as a URL
              and never downloaded.
            </p>
          </ToolPanel>
          <ToolPanel title="Extracted tags">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
              {serializeOpenGraphTags(tags)}
            </pre>
          </ToolPanel>
        </>
      ) : (
        <ToolPanel title="Preview">
          <p role="alert" className="text-sm text-[var(--text-secondary)]">
            No Open Graph or Twitter Card meta tags were found in the pasted content.
          </p>
        </ToolPanel>
      )}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        This tool works entirely offline: it reads only the markup you paste and never fetches the
        page, its images, or any other resource. Open Graph values win over Twitter Card values
        when both are present.
      </p>
    </div>
  )
}