import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  decodeText,
  encodeText,
  maximumTextCharacters,
  numberBases,
  byteDelimiters,
  type ByteDelimiter,
  type NumberBase,
} from "./text-binary"

const baseLabels: Record<NumberBase, string> = {
  binary: "Binary (base 2)",
  octal: "Octal (base 8)",
  decimal: "Decimal (base 10)",
}

const delimiterLabels: Record<ByteDelimiter, string> = {
  space: "Space",
  newline: "Newline",
  none: "None (fixed width)",
}

export default function TextBinaryConverter() {
  const [text, setText] = useState("")
  const [encoded, setEncoded] = useState("")
  const [base, setBase] = useState<NumberBase>("binary")
  const [delimiter, setDelimiter] = useState<ByteDelimiter>("space")
  const [decodeBase, setDecodeBase] = useState<NumberBase>("binary")
  const [decodeDelimiter, setDecodeDelimiter] = useState<ByteDelimiter>("space")

  const overCap = text.length > maximumTextCharacters
  const encodedResult = useMemo(
    () => (overCap ? null : encodeText(text, base, delimiter)),
    [text, base, delimiter, overCap],
  )
  const decoded = useMemo(
    () => decodeText(encoded, decodeBase, decodeDelimiter),
    [encoded, decodeBase, decodeDelimiter],
  )

  return (
    <div className="grid gap-4">
      <ToolPanel title="Text to bytes">
        <div className="grid gap-4">
          <Field
            error={
              overCap
                ? `The text is capped at ${maximumTextCharacters.toLocaleString("en-US")} characters.`
                : undefined
            }
            hint="Encoded as UTF-8 bytes, so accented characters, CJK, and emoji become multiple values."
            htmlFor="text-binary-text"
            label="Text"
          >
            <textarea
              className="app-input min-h-24"
              id="text-binary-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="café 東京 👋"
              value={text}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="text-binary-base"
              >
                Number base (encode)
              </label>
              <select
                className="app-input"
                id="text-binary-base"
                onChange={(event) => setBase(event.target.value as NumberBase)}
                value={base}
              >
                {numberBases.map((option) => (
                  <option key={option} value={option}>
                    {baseLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="text-binary-delimiter"
              >
                Delimiter (encode)
              </label>
              <select
                className="app-input"
                id="text-binary-delimiter"
                onChange={(event) => setDelimiter(event.target.value as ByteDelimiter)}
                value={delimiter}
              >
                {byteDelimiters.map((option) => (
                  <option key={option} value={option}>
                    {delimiterLabels[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Field
            hint="Copy this into the Decode panel (with the same base and delimiter) to round-trip."
            htmlFor="text-binary-encoded"
            label="Encoded values (from text)"
          >
            <textarea
              className="app-input min-h-24 font-mono"
              id="text-binary-encoded"
              readOnly
              value={encodedResult ?? ""}
            />
          </Field>
        </div>
      </ToolPanel>

      <ToolPanel title="Bytes to text">
        <div className="grid gap-4">
          <Field
            hint="Use the same base and delimiter the values were encoded with."
            htmlFor="text-binary-decode-input"
            label="Encoded values (to decode)"
          >
            <textarea
              className="app-input min-h-24 font-mono"
              id="text-binary-decode-input"
              onChange={(event) => setEncoded(event.target.value)}
              placeholder="72 105"
              value={encoded}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="text-binary-decode-base"
              >
                Number base (decode)
              </label>
              <select
                className="app-input"
                id="text-binary-decode-base"
                onChange={(event) => setDecodeBase(event.target.value as NumberBase)}
                value={decodeBase}
              >
                {numberBases.map((option) => (
                  <option key={option} value={option}>
                    {baseLabels[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <label
                className="text-sm font-semibold text-[var(--text)]"
                htmlFor="text-binary-decode-delimiter"
              >
                Delimiter (decode)
              </label>
              <select
                className="app-input"
                id="text-binary-decode-delimiter"
                onChange={(event) => setDecodeDelimiter(event.target.value as ByteDelimiter)}
                value={decodeDelimiter}
              >
                {byteDelimiters.map((option) => (
                  <option key={option} value={option}>
                    {delimiterLabels[option]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Button
              onClick={() => {
                setEncoded("")
                setText("")
              }}
              variant="quiet"
            >
              Clear both
            </Button>
          </div>
          <p aria-live="polite" className="text-sm" role="status">
            {decoded.status === "ok"
              ? `Decoded ${decoded.byteCount} byte${decoded.byteCount === 1 ? "" : "s"} into text.`
              : decoded.message}
          </p>
          {decoded.status === "ok" ? (
            <Field
              hint="Round-trips through the same UTF-8 byte encoding."
              htmlFor="text-binary-decoded"
              label="Decoded text"
            >
              <textarea
                className="app-input min-h-24"
                id="text-binary-decoded"
                readOnly
                value={decoded.text}
              />
            </Field>
          ) : null}
        </div>
      </ToolPanel>

      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        With the "None" delimiter every value is zero-padded to its base's full byte width so the
        stream splits unambiguously. Bytes that are not valid UTF-8 fail closed instead of producing
        silent replacement characters. Everything runs on this device; nothing is stored, logged, or
        uploaded.
      </p>
    </div>
  )
}
