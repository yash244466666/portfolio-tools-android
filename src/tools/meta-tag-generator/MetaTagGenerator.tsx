import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildMetaTags,
  defaultMetaTagInput,
  hasAnyMetaTagContent,
  maximumMetaFieldChars,
  ogTypeOptions,
  twitterCardOptions,
  type MetaTagInput,
} from "./meta-tags"

const basicFields: Array<{
  key: "title" | "description" | "keywords" | "author" | "viewport" | "robots" | "canonical"
  label: string
  placeholder: string
}> = [
  { key: "title", label: "Title", placeholder: "My Website" },
  { key: "description", label: "Description", placeholder: "A brief description of your website" },
  { key: "keywords", label: "Keywords", placeholder: "web, development, tools" },
  { key: "author", label: "Author", placeholder: "Jane Doe" },
  { key: "viewport", label: "Viewport", placeholder: "width=device-width, initial-scale=1" },
  { key: "robots", label: "Robots", placeholder: "index, follow" },
  { key: "canonical", label: "Canonical URL", placeholder: "https://example.com/page" },
]

export default function MetaTagGenerator() {
  const [input, setInput] = useState<MetaTagInput>(defaultMetaTagInput)
  const [status, setStatus] = useState("")

  function update(key: keyof MetaTagInput, value: string) {
    setInput((previous) => ({ ...previous, [key]: value }))
  }

  const generated = buildMetaTags(input)
  const hasContent = hasAnyMetaTagContent(input)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Basic meta tags">
        <div className="grid gap-3">
          {basicFields.map((field) => (
            <Field
              error={
                input[field.key].length >= maximumMetaFieldChars
                  ? `This field reaches the ${maximumMetaFieldChars} character limit.`
                  : undefined
              }
              htmlFor={`meta-${field.key}`}
              key={field.key}
              label={field.label}
            >
              <input
                className="app-input font-mono"
                id={`meta-${field.key}`}
                maxLength={maximumMetaFieldChars}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={input[field.key]}
              />
            </Field>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title="Open Graph">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">og:type</legend>
          <div className="flex flex-wrap gap-2">
            {ogTypeOptions.map((type) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-3 py-2 font-mono text-sm ${
                  input.ogType === type
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={type}
              >
                <input
                  checked={input.ogType === type}
                  className="sr-only"
                  name="meta-og-type"
                  onChange={() => update("ogType", type)}
                  type="radio"
                  value={type}
                />
                {type}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 grid gap-3">
          {(
            [
              { key: "ogTitle", label: "og:title", placeholder: input.title || "My Website" },
              {
                key: "ogDescription",
                label: "og:description",
                placeholder: input.description || "A brief description",
              },
              { key: "ogImage", label: "og:image", placeholder: "https://example.com/image.png" },
              { key: "ogUrl", label: "og:url", placeholder: "https://example.com" },
            ] as Array<{
              key: "ogTitle" | "ogDescription" | "ogImage" | "ogUrl"
              label: string
              placeholder: string
            }>
          ).map((field) => (
            <Field
              htmlFor={`meta-${field.key}`}
              key={field.key}
              label={field.label}
              hint="Only included when non-empty; setting any Open Graph field enables the block."
            >
              <input
                className="app-input font-mono"
                id={`meta-${field.key}`}
                maxLength={maximumMetaFieldChars}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={input[field.key]}
              />
            </Field>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel title="Twitter card">
        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-[var(--text)]">twitter:card</legend>
          <div className="flex flex-wrap gap-2">
            {twitterCardOptions.map((card) => (
              <label
                className={`flex min-h-12 items-center rounded-2xl border px-3 py-2 font-mono text-sm ${
                  input.twCard === card
                    ? "border-[var(--primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border)]"
                }`}
                key={card}
              >
                <input
                  checked={input.twCard === card}
                  className="sr-only"
                  name="meta-tw-card"
                  onChange={() => update("twCard", card)}
                  type="radio"
                  value={card}
                />
                {card}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 grid gap-3">
          {(
            [
              {
                key: "twTitle",
                label: "twitter:title",
                placeholder: input.ogTitle || input.title || "My Website",
              },
              {
                key: "twDescription",
                label: "twitter:description",
                placeholder: input.ogDescription || input.description || "A brief description",
              },
              {
                key: "twImage",
                label: "twitter:image",
                placeholder: input.ogImage || "https://example.com/image.png",
              },
            ] as Array<{
              key: "twTitle" | "twDescription" | "twImage"
              label: string
              placeholder: string
            }>
          ).map((field) => (
            <Field
              htmlFor={`meta-${field.key}`}
              key={field.key}
              label={field.label}
              hint="Only included when non-empty; setting any Twitter field enables the block."
            >
              <input
                className="app-input font-mono"
                id={`meta-${field.key}`}
                maxLength={maximumMetaFieldChars}
                onChange={(event) => update(field.key, event.target.value)}
                placeholder={field.placeholder}
                value={input[field.key]}
              />
            </Field>
          ))}
        </div>
      </ToolPanel>

      <ToolPanel
        action={
          hasContent ? (
            <CopyButton label="Copy" onStatus={setStatus} value={generated} />
          ) : undefined
        }
        title="Generated meta tags"
      >
        {hasContent ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-sm text-[var(--text)]">
            {generated}
          </pre>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Fill in a field above to generate the tags.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          Values are HTML-escaped, so a quote in a title cannot break the generated markup. The
          output is generated on this device only and never sent anywhere.
        </p>
      </ToolPanel>

      <Button onClick={() => setInput(defaultMetaTagInput)} variant="quiet">
        Reset all fields
      </Button>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
