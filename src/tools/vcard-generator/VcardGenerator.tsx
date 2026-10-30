import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { ResultReveal } from "@/components/motion/primitives"
import { buildVcard } from "./vcard"

export default function VcardGenerator() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [organization, setOrganization] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [url, setUrl] = useState("")
  const [address, setAddress] = useState("")
  const [output, setOutput] = useState("")
  const [error, setError] = useState("")
  const [status, setStatus] = useState("")

  function generate() {
    const result = buildVcard({
      firstName,
      lastName,
      organization,
      phone,
      email,
      url,
      address,
    })
    if (result.status === "error") {
      setOutput("")
      setError(result.message)
      return
    }
    setError("")
    setOutput(result.card)
  }

  function reset() {
    setFirstName("")
    setLastName("")
    setOrganization("")
    setPhone("")
    setEmail("")
    setUrl("")
    setAddress("")
    setOutput("")
    setError("")
    setStatus("")
  }

  return (
    <div className="grid gap-4">
      <ToolPanel title="Contact details">
        <div className="grid gap-3">
          <Field
            error={error === "" ? undefined : error}
            hint="At least one name is required. Escaping follows RFC 2426: semicolons, commas, backslashes, and newlines are safe."
            htmlFor="vcard-first-name"
            label="First name"
          >
            <input
              className="app-input"
              id="vcard-first-name"
              onChange={(event) => setFirstName(event.target.value)}
              placeholder="Ada"
              value={firstName}
            />
          </Field>
          <Field htmlFor="vcard-last-name" label="Last name">
            <input
              className="app-input"
              id="vcard-last-name"
              onChange={(event) => setLastName(event.target.value)}
              placeholder="Lovelace"
              value={lastName}
            />
          </Field>
          <Field htmlFor="vcard-organization" label="Organization (optional)">
            <input
              className="app-input"
              id="vcard-organization"
              onChange={(event) => setOrganization(event.target.value)}
              placeholder="Acme Inc."
              value={organization}
            />
          </Field>
          <Field htmlFor="vcard-phone" label="Phone (optional)">
            <input
              className="app-input"
              id="vcard-phone"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+880 1XX XXX XXXX"
              value={phone}
            />
          </Field>
          <Field htmlFor="vcard-email" label="Email (optional)">
            <input
              className="app-input"
              id="vcard-email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ada@example.com"
              value={email}
            />
          </Field>
          <Field
            hint="Only https links are included."
            htmlFor="vcard-url"
            label="Website (optional)"
          >
            <input
              className="app-input"
              id="vcard-url"
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com"
              value={url}
            />
          </Field>
          <Field htmlFor="vcard-address" label="Address (optional)">
            <input
              className="app-input"
              id="vcard-address"
              onChange={(event) => setAddress(event.target.value)}
              placeholder="1 Main St, City, Country"
              value={address}
            />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={generate}>Generate vCard</Button>
          <Button onClick={reset} variant="quiet">
            Clear
          </Button>
        </div>
      </ToolPanel>

      {output !== "" ? (
        <ToolPanel
          title="Result"
          action={<CopyButton label="Copy vCard" onStatus={setStatus} value={output} />}
        >
          <ResultReveal token={output}>
            <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
              {output}
            </pre>
          </ResultReveal>
        </ToolPanel>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        The card copies to the clipboard as plain text; save it with a `.vcf` extension and any
        contact app can import it. Nothing is saved or uploaded; this tool has no network access.
      </p>
    </div>
  )
}
