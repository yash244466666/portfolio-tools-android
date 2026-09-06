import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import {
  allExpandablePaths,
  buildJsonTree,
  formatJson,
  isValidJsonSize,
  maximumJsonBytes,
  maximumRenderedTreeNodes,
  minifyJson,
  parseJson,
  type JsonTreeEntry,
} from "./json"

const jsonFileName = "data.json"
const jsonMimeType = "application/json"

type EditorTab = "editor" | "tree"

export default function JsonEditor() {
  const { files } = usePlatform()
  const [text, setText] = useState("")
  const [expandedPaths, setExpandedPaths] = useState<ReadonlySet<string>>(() => new Set())
  const [tab, setTab] = useState<EditorTab>("editor")
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)

  const overLimit = !isValidJsonSize(text)
  const parse = useMemo(
    () => (text.trim() && !overLimit ? parseJson(text) : null),
    [text, overLimit],
  )
  const parseError = parse?.status === "invalid" ? parse.message : undefined
  const value = parse?.status === "ok" ? parse.value : undefined
  const tree = useMemo(
    () => (value !== undefined ? buildJsonTree(value, expandedPaths) : null),
    [value, expandedPaths],
  )
  const validity = overLimit
    ? "Over the size limit"
    : parse === null
      ? "Empty"
      : parse.status === "ok"
        ? "Valid JSON"
        : "Invalid JSON"

  function applyTransform(kind: "format" | "minify") {
    const result = kind === "format" ? formatJson(text) : minifyJson(text)
    if (result.status === "ok") {
      setText(result.text)
      setStatus(kind === "format" ? "JSON formatted." : "JSON minified.")
    } else {
      setStatus(result.message)
    }
  }

  function togglePath(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function expandAll() {
    if (value === undefined) return
    const { paths, tooLarge } = allExpandablePaths(value)
    if (tooLarge) {
      setStatus("The document has too many sections to expand at once. Expand them individually.")
      return
    }
    setExpandedPaths(new Set(paths))
  }

  async function exportJson(action: "share" | "save") {
    if (!text || busy) return
    setBusy(true)
    try {
      const file = {
        name: jsonFileName,
        mimeType: jsonMimeType,
        data: text,
        encoding: "utf8",
      } as const
      if (action === "share") {
        await files.share(file)
        setStatus("JSON shared.")
      } else {
        await files.saveAs(file)
        setStatus("JSON saved.")
      }
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  function reset() {
    setText("")
    setExpandedPaths(new Set())
    setStatus("JSON tool reset.")
  }

  return (
    <div className="grid gap-4">
      <div aria-label="JSON view" className="grid grid-cols-2 gap-2 lg:hidden" role="tablist">
        <Button
          aria-selected={tab === "editor"}
          onClick={() => setTab("editor")}
          role="tab"
          variant={tab === "editor" ? "primary" : "secondary"}
        >
          Editor
        </Button>
        <Button
          aria-selected={tab === "tree"}
          onClick={() => setTab("tree")}
          role="tab"
          variant={tab === "tree" ? "primary" : "secondary"}
        >
          Tree
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tab === "editor" ? "" : "hidden lg:block"}>
          <ToolPanel title="Editor">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button disabled={parse?.status !== "ok"} onClick={() => applyTransform("format")}>
                  Format
                </Button>
                <Button
                  disabled={parse?.status !== "ok"}
                  onClick={() => applyTransform("minify")}
                  variant="secondary"
                >
                  Minify
                </Button>
                <span className="text-sm font-semibold text-[var(--text-secondary)]">
                  {validity}
                </span>
              </div>
              <Field
                error={
                  overLimit
                    ? `JSON input is limited to ${Math.round(maximumJsonBytes / 1024)} KiB. Shorten the document.`
                    : parseError
                }
                hint={`Validated, formatted, and inspected locally. Never saved or uploaded. ${Math.round(maximumJsonBytes / 1024)} KiB maximum.`}
                htmlFor="json-input"
                label="JSON input"
              >
                <textarea
                  aria-describedby={
                    overLimit || parseError ? "json-input-error" : "json-input-hint"
                  }
                  className="app-input min-h-64 resize-y font-mono text-sm"
                  id="json-input"
                  onChange={(event) => setText(event.target.value)}
                  placeholder={'For example {"name": "Yash Tools", "offline": true}'}
                  spellCheck={false}
                  value={text}
                />
              </Field>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <CopyButton label="Copy JSON" onStatus={setStatus} value={text} />
                <Button
                  disabled={!text || busy}
                  onClick={() => void exportJson("share")}
                  variant="secondary"
                >
                  Share JSON
                </Button>
                <Button
                  disabled={!text || busy}
                  onClick={() => void exportJson("save")}
                  variant="secondary"
                >
                  Save JSON
                </Button>
                <Button disabled={!text && !status} onClick={reset} variant="quiet">
                  Reset
                </Button>
              </div>
              {status ? (
                <p
                  aria-live="polite"
                  className="text-sm text-[var(--text-secondary)]"
                  role="status"
                >
                  {status}
                </p>
              ) : null}
            </div>
          </ToolPanel>
        </div>

        <div className={tab === "tree" ? "" : "hidden lg:block"}>
          <ToolPanel
            action={
              tree && tree.entries.length > 1 ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={expandAll} variant="quiet">
                    Expand all
                  </Button>
                  <Button onClick={() => setExpandedPaths(new Set())} variant="quiet">
                    Collapse all
                  </Button>
                </div>
              ) : undefined
            }
            title="Tree"
          >
            {tree ? (
              <div className="grid gap-2">
                <ul className="grid gap-0.5 overflow-x-auto">
                  {tree.entries.map((entry) => (
                    <JsonTreeRow entry={entry} key={entry.path} onToggle={togglePath} />
                  ))}
                </ul>
                {tree.capped ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Showing the first {maximumRenderedTreeNodes} tree nodes. Collapse sections to
                    inspect the rest.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)]">
                The tree appears here once the JSON is valid.
              </p>
            )}
          </ToolPanel>
        </div>
      </div>
    </div>
  )
}

function JsonTreeRow({
  entry,
  onToggle,
}: {
  entry: JsonTreeEntry
  onToggle: (path: string) => void
}) {
  const indentation = { paddingLeft: `${Math.min(entry.depth, 12) * 0.75}rem` }
  return (
    <li className="flex items-center gap-2 text-sm" style={indentation}>
      {entry.expandable ? (
        <button
          aria-expanded={entry.expanded}
          className="min-h-12 cursor-pointer rounded-md px-1 text-left font-semibold text-[var(--text)] hover:bg-[var(--surface-hover)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)]"
          onClick={() => onToggle(entry.path)}
        >
          <span aria-hidden="true">{entry.expanded ? "▾" : "▸"}</span> {entry.label}
        </button>
      ) : (
        <span className="min-h-12 px-1 font-semibold leading-12 text-[var(--text)]">
          {entry.label}
        </span>
      )}
      <span className="break-all font-mono text-xs text-[var(--text-secondary)]">
        {entry.type} · {entry.preview}
      </span>
    </li>
  )
}
