import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { isValidMarkdownSize, maximumMarkdownBytes, renderMarkdown } from "./markdown"

const renderDebounceMs = 150
const inputPlaceholder = "# Hello World\n\nThis is **markdown** preview.\n"

interface RenderedPreview {
  html: string
  error: string
}

export default function MarkdownPreview() {
  const [markdown, setMarkdown] = useState("")
  const [debounced, setDebounced] = useState("")
  const [status, setStatus] = useState("")

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(markdown), renderDebounceMs)
    return () => window.clearTimeout(timeout)
  }, [markdown])

  const overLimit = !isValidMarkdownSize(markdown)

  const rendered = useMemo<RenderedPreview>(() => {
    if (overLimit || !debounced) return { html: "", error: "" }
    try {
      return { html: renderMarkdown(debounced), error: "" }
    } catch {
      return { html: "", error: "The preview could not be rendered from this input." }
    }
  }, [debounced, overLimit])

  function reset() {
    setMarkdown("")
    setDebounced("")
    setStatus("Markdown tool reset.")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <Field
            error={
              overLimit
                ? "The Markdown exceeds the 256 KiB input limit. Shorten the text to preview it."
                : undefined
            }
            hint={`Processed locally in memory and never saved or uploaded. Maximum ${Math.round(maximumMarkdownBytes / 1024)} KiB. Scripts, styles, and dangerous links are removed from the preview.`}
            htmlFor="markdown-input"
            label="Markdown input"
          >
            <textarea
              aria-describedby={overLimit ? "markdown-input-error" : "markdown-input-hint"}
              className="app-input min-h-44 resize-y font-mono"
              id="markdown-input"
              onChange={(event) => setMarkdown(event.target.value)}
              placeholder={inputPlaceholder}
              spellCheck={false}
              value={markdown}
            />
          </Field>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <CopyButton label="Copy Markdown" onStatus={setStatus} value={markdown} />
            <Button disabled={!markdown} onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          rendered.html ? (
            <CopyButton label="Copy HTML" onStatus={setStatus} value={rendered.html} />
          ) : undefined
        }
        title="Preview"
      >
        <div
          aria-label="Rendered preview"
          className={`markdown-preview min-h-32 overflow-x-auto text-base leading-7 text-[var(--text)] ${rendered.html ? "" : "text-[var(--text-tertiary)]"}`}
          role="region"
        >
          {rendered.html ? (
            <div
              className="markdown-preview-content [&_a]:underline [&_a]:text-[var(--primary)] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--border-strong)] [&_blockquote]:pl-3 [&_blockquote]:text-[var(--text-secondary)] [&_code]:rounded-md [&_code]:bg-[var(--surface-muted)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:font-semibold [&_h4]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-[var(--surface-muted)] [&_pre]:p-3 [&_pre]:text-sm [&_table]:w-full [&_table]:text-sm [&_td]:border [&_td]:border-[var(--border)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--border)] [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
            />
          ) : rendered.error ? (
            <p role="alert">{rendered.error}</p>
          ) : overLimit ? (
            <p>Shorten the Markdown to see the preview.</p>
          ) : (
            <p>The preview appears here as you type.</p>
          )}
        </div>
      </ToolPanel>

      <p aria-live="polite" className="sr-only">
        {status}
      </p>
    </div>
  )
}
