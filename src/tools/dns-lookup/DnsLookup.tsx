import { useEffect, useRef, useState } from "react"
import { CloudOff, Globe, Wifi } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { fetchDnsRecords, type LookupOutcome } from "./dns-client"
import {
  describeRcode,
  formatRecordsForCopy,
  maximumRecords,
  providerHomepage,
  providerName,
  recordTypes,
  recordTypeLabel,
  validateDomainName,
  type DnsRecord,
  type RecordTypeName,
} from "./dns"

/**
 * Terminal failures of one lookup. "Loading", "done", and "no-record" are phases,
 * not failures, so a lookup can never desync the UI from the last action.
 */
type FailureKind =
  | "offline"
  | "timeout"
  | "rate-limited"
  | "provider-failure"
  | "malformed"
  | "invalid-query"
  | "cancelled"

const failureMessages: Record<FailureKind, string> = {
  offline: "The lookup could not be sent. Check the connection and try again.",
  timeout: "The lookup timed out. Check the connection and try again.",
  "rate-limited": "The DNS resolver is limiting requests right now. Wait a little and try again.",
  "provider-failure": "The DNS resolver returned an error. Try again in a moment.",
  malformed: "The resolver response could not be understood. Try again in a moment.",
  "invalid-query": "The resolver rejected this query. Check the domain name and record type.",
  cancelled: "The lookup was cancelled.",
}

const recordTypeDescriptions: Record<RecordTypeName, string> = {
  A: "IPv4 addresses",
  AAAA: "IPv6 addresses",
  CNAME: "Alias names",
  MX: "Mail servers",
  NS: "Name servers",
  TXT: "Text records",
}

type Phase =
  | { kind: "idle" }
  | { kind: "loading"; name: string }
  | { kind: "done"; name: string; type: RecordTypeName; records: DnsRecord[] }
  | { kind: "no-record"; name: string; type: RecordTypeName }
  | { kind: "dns-error"; name: string; rcode: number }
  | { kind: "failed"; failure: FailureKind }

export default function DnsLookup() {
  const { network, browser } = usePlatform()
  const [nameInput, setNameInput] = useState("")
  const [recordType, setRecordType] = useState<RecordTypeName>("A")
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })
  const [connected, setConnected] = useState(true)
  const [showValidation, setShowValidation] = useState(false)
  const [status, setStatus] = useState("")
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void | Promise<void>) | undefined
    let active = true
    void network.current().then((state) => {
      if (active) setConnected(state.connected)
    })
    void network
      .subscribe((state) => {
        if (active) setConnected(state.connected)
      })
      .then((unsubscribeFn) => {
        unsubscribe = unsubscribeFn
      })
    return () => {
      active = false
      void unsubscribe?.()
    }
  }, [network])

  const validation = validateDomainName(nameInput)
  const validationError =
    showValidation && validation.status === "invalid" ? validation.reason : undefined

  function lookup() {
    setShowValidation(true)
    const validated = validateDomainName(nameInput)
    if (validated.status === "invalid") return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setPhase({ kind: "loading", name: validated.value })
    void fetchDnsRecords({
      name: validated.value,
      type: recordType,
      signal: controller.signal,
    }).then((outcome) => {
      if (controller.signal.aborted) return
      applyOutcome(outcome, validated.value)
    })
  }

  function applyOutcome(outcome: LookupOutcome, name: string) {
    switch (outcome.status) {
      case "ok":
        setPhase({ kind: "done", name, type: recordType, records: outcome.records })
        setStatus(`Received ${outcome.records.length} record(s) from ${providerName}.`)
        break
      case "no-record":
        setPhase({ kind: "no-record", name, type: recordType })
        break
      case "dns-error":
        setPhase({ kind: "dns-error", name, rcode: outcome.rcode })
        break
      default:
        setPhase({ kind: "failed", failure: outcome.status })
    }
  }

  function reset() {
    abortRef.current?.abort()
    setNameInput("")
    setRecordType("A")
    setPhase({ kind: "idle" })
    setShowValidation(false)
    setStatus("DNS tool reset.")
  }

  const copyText = phase.kind === "done" ? formatRecordsForCopy(phase.records) : ""

  return (
    <div className="grid gap-4">
      <ToolPanel title="Look up records">
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            lookup()
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <Field
              error={validationError}
              hint="Only the domain name and record type are sent to Cloudflare."
              htmlFor="dns-name"
              label="Domain name"
            >
              <input
                aria-describedby={validationError ? "dns-name-error" : "dns-name-hint"}
                aria-invalid={validationError ? true : undefined}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className="app-input font-mono"
                id="dns-name"
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="For example example.com"
                spellCheck={false}
                type="text"
                value={nameInput}
              />
            </Field>
            <Field
              hint={recordTypeDescriptions[recordType] + "."}
              htmlFor="dns-type"
              label="Record type"
            >
              <select
                aria-describedby="dns-type-hint"
                className="app-input"
                id="dns-type"
                onChange={(event) => setRecordType(event.target.value as RecordTypeName)}
                value={recordType}
              >
                {recordTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              disabled={phase.kind === "loading" || !connected}
              type="submit"
              variant="primary"
            >
              <Globe aria-hidden="true" size={18} /> Look up
            </Button>
            <Button onClick={reset} variant="secondary">
              Reset
            </Button>
          </div>
        </form>
      </ToolPanel>

      <ToolPanel
        action={
          phase.kind === "done" && phase.records.length > 0 ? (
            <CopyButton label="Copy records" onStatus={setStatus} value={copyText} />
          ) : undefined
        }
        title="Results"
      >
        <div className="grid gap-3 text-sm">
          {!connected ? (
            <p className="flex items-center gap-2 text-[var(--text-secondary)]" role="status">
              <CloudOff aria-hidden="true" size={16} /> Offline — lookups need a connection.
            </p>
          ) : null}

          {phase.kind === "idle" ? (
            <p className="text-[var(--text-secondary)]">
              Enter a domain name to look up its DNS records.
            </p>
          ) : null}

          {phase.kind === "loading" ? (
            <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
              Looking up {recordType} records for {phase.name}…
            </p>
          ) : null}

          {phase.kind === "failed" ? <p role="alert">{failureMessages[phase.failure]}</p> : null}

          {phase.kind === "dns-error" ? (
            <p role="alert">
              {phase.name}: {describeRcode(phase.rcode)}
            </p>
          ) : null}

          {phase.kind === "no-record" ? (
            <p role="status">
              No {phase.type} records were returned for {phase.name}. The domain may not publish
              this record type.
            </p>
          ) : null}

          {phase.kind === "done" ? (
            <>
              <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
                {phase.records.length} record{phase.records.length === 1 ? "" : "s"} for{" "}
                {phase.name} · answered by {providerName}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <caption className="sr-only">
                    {phase.type} records for {phase.name}
                  </caption>
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left text-[var(--text-secondary)]">
                      <th scope="col" className="px-2 py-2 font-medium">
                        Name
                      </th>
                      <th scope="col" className="px-2 py-2 font-medium">
                        Type
                      </th>
                      <th scope="col" className="px-2 py-2 font-medium">
                        TTL (s)
                      </th>
                      <th scope="col" className="px-2 py-2 font-medium">
                        Data
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {phase.records.map((record, index) => (
                      <tr
                        key={`${record.name}-${record.type}-${index}`}
                        className="border-b border-[var(--border)] last:border-0"
                      >
                        <td className="break-all px-2 py-2 font-mono">{record.name}</td>
                        <td className="px-2 py-2 font-mono">{recordTypeLabel(record.type)}</td>
                        <td className="px-2 py-2 font-mono">{record.TTL}</td>
                        <td className="break-all px-2 py-2 font-mono">{record.data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {phase.records.length >= maximumRecords ? (
                <p className="text-[var(--text-secondary)]">
                  Showing the first {maximumRecords} records.
                </p>
              ) : null}
            </>
          ) : null}
        </div>
      </ToolPanel>

      <ToolPanel title="Provider and privacy">
        <div className="grid gap-3 text-sm leading-6 text-[var(--text-secondary)]">
          <p className="flex items-center gap-2">
            <Wifi aria-hidden="true" size={16} /> This tool requires internet for DNS lookups.
          </p>
          <p>
            Lookups are answered by {providerName}'s 1.1.1.1 resolver over encrypted DNS-over-HTTPS.
            When you look up records, only the domain name and record type are sent to{" "}
            <span className="font-mono">cloudflare-dns.com</span>. Cloudflare's privacy policy
            applies to the query; nothing about your lookups is stored by this app.
          </p>
          <Button
            className="justify-self-start"
            onClick={() => void browser.open(new URL(providerHomepage))}
            variant="quiet"
          >
            <Wifi aria-hidden="true" size={18} /> About {providerName}
          </Button>
          {status ? (
            <p aria-live="polite" className="text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>
    </div>
  )
}
