import { useEffect, useMemo, useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { caseConversions, maximumCaseChars } from "./case"

export default function CaseConverter() {
  const [text, setText] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const overLimit = text.length > maximumCaseChars

  // Eight conversions per keystroke is bounded work by construction: the input is
  // rejected above the limit instead of being converted.
  const results = useMemo(
    () =>
      overLimit
        ? null
        : caseConversions.map((conversion) => ({
            ...conversion,
            output: conversion.convert(text),
          })),
    [text, overLimit],
  )
  const limitLabel = maximumCaseChars.toLocaleString("en-US")

  useEffect(() => {
    if (copiedId === null) return
    const timeout = window.setTimeout(() => setCopiedId(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [copiedId])

  return (
    <div className="grid gap-4">
      <ToolPanel title="Input">
        <Field
          error={
            overLimit
              ? `The text exceeds the ${limitLabel} character limit. Shorten it to convert.`
              : undefined
          }
          hint={`Conversions update as you type, up to ${limitLabel} characters.`}
          htmlFor="case-input"
          label="Text"
        >
          <textarea
            aria-describedby={overLimit ? "case-input-error" : "case-input-hint"}
            className="app-input min-h-32 resize-y"
            id="case-input"
            onChange={(event) => setText(event.target.value)}
            placeholder="Type or paste text to convert…"
            value={text}
          />
        </Field>
      </ToolPanel>

      {overLimit ? (
        <ToolPanel muted>
          <p role="alert">
            The text exceeds the {limitLabel} character limit. Shorten it to convert.
          </p>
        </ToolPanel>
      ) : (
        <ToolPanel title="Conversions">
          {results && text.length > 0 ? (
            <ul className="grid gap-3">
              {results.map((result) => (
                <li
                  className="grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
                  key={result.id}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[var(--text)]">{result.label}</p>
                    <CopyButton
                      label="Copy"
                      onStatus={() => setCopiedId(result.id)}
                      value={result.output}
                    />
                  </div>
                  <p
                    className={`break-all font-mono text-sm ${copiedId === result.id ? "motion-pop" : ""}`}
                  >
                    {result.output || "—"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">
              Enter text above to see it as UPPERCASE, lowercase, Title Case, Sentence case,
              camelCase, PascalCase, snake_case, and kebab-case.
            </p>
          )}
        </ToolPanel>
      )}
    </div>
  )
}
