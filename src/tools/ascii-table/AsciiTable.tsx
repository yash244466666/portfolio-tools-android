import { useState } from "react"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  asciiCopyText,
  filterAsciiEntries,
  isControlCode,
  maximumAsciiQueryChars,
  toAsciiHex,
  toAsciiOctal,
} from "./ascii-table"

export default function AsciiTable() {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("")

  const overLimit = search.length > maximumAsciiQueryChars
  const query = overLimit ? "" : search
  const filtered = filterAsciiEntries(query)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Search">
        <Field
          error={
            overLimit
              ? `The query exceeds the ${maximumAsciiQueryChars} character limit.`
              : undefined
          }
          hint="Match by decimal (65), hex (41), octal (101), character, or description."
          htmlFor="ascii-search"
          label="Search ASCII"
        >
          <input
            className="app-input font-mono"
            id="ascii-search"
            maxLength={maximumAsciiQueryChars}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="e.g. 65, 0x41, newline"
            type="search"
            value={search}
          />
        </Field>
      </ToolPanel>

      <ToolPanel title={`Table (${filtered.length} rows)`}>
        {overLimit ? null : filtered.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No characters match this search. Clear the query to see the full table.
          </p>
        ) : (
          <div className="max-h-[28rem] overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                ASCII characters with decimal, hexadecimal, and octal values and descriptions; each
                row has a copy button.
              </caption>
              <thead>
                <tr>
                  <th
                    className="px-2 py-2 text-left font-medium text-[var(--text-secondary)]"
                    scope="col"
                  >
                    Dec
                  </th>
                  <th
                    className="px-2 py-2 text-left font-medium text-[var(--text-secondary)]"
                    scope="col"
                  >
                    Hex
                  </th>
                  <th
                    className="px-2 py-2 text-left font-medium text-[var(--text-secondary)]"
                    scope="col"
                  >
                    Oct
                  </th>
                  <th
                    className="px-2 py-2 text-left font-medium text-[var(--text-secondary)]"
                    scope="col"
                  >
                    Char
                  </th>
                  <th
                    className="px-2 py-2 text-left font-medium text-[var(--text-secondary)]"
                    scope="col"
                  >
                    Description
                  </th>
                  <th className="px-2 py-2" scope="col">
                    <span className="sr-only">Copy</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr className="border-t border-[var(--border)]" key={entry.dec}>
                    <td className="px-2 py-2 font-mono text-[var(--text)]">{entry.dec}</td>
                    <td className="px-2 py-2 font-mono text-[var(--text)]">
                      {toAsciiHex(entry.dec)}
                    </td>
                    <td className="px-2 py-2 font-mono text-[var(--text)]">
                      {toAsciiOctal(entry.dec)}
                    </td>
                    <td className="px-2 py-2 font-mono">
                      {isControlCode(entry.dec) ? (
                        <span className="text-xs text-[var(--text-secondary)]">{entry.char}</span>
                      ) : (
                        <span className="font-bold text-[var(--text)]">{entry.char}</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-[var(--text-secondary)]">{entry.description}</td>
                    <td className="px-2 py-1">
                      <CopyButton
                        label={`Copy ${entry.dec} character`}
                        onStatus={setStatus}
                        value={asciiCopyText(entry)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ToolPanel>

      <p className="text-sm text-[var(--text-secondary)]">
        The table is bundled on this device and works offline. Control-code rows copy the raw
        control byte; printable rows copy the shown character.
      </p>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
