import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { expiryState, formatEpochClaim, maximumJwtLength, numericClaim, parseJwt } from "./jwt"

const limitLabel = maximumJwtLength.toLocaleString("en-US")

const expiryRefreshIntervalMs = 30_000

export default function JwtDecoder() {
  const [token, setToken] = useState("")
  const [status, setStatus] = useState("")
  // The device clock is read outside render (initializer and interval tick)
  // so the exp verdict refreshes without an impure render.
  const [nowMs, setNowMs] = useState(() => Date.now())

  const overLimit = token.length > maximumJwtLength

  const parsed = useMemo(() => {
    if (overLimit) return null
    return parseJwt(token)
  }, [token, overLimit])

  const claims = parsed?.claims ?? null
  const errorMessage = overLimit
    ? `The token is limited to ${limitLabel} characters.`
    : (parsed?.message ?? "")

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), expiryRefreshIntervalMs)
    return () => window.clearInterval(interval)
  }, [])

  const expiry = claims === null ? null : expiryState(claims.payload, nowMs)
  const issuedAtSeconds = claims === null ? null : numericClaim(claims.payload, "iat").epochSeconds
  const notBeforeSeconds = claims === null ? null : numericClaim(claims.payload, "nbf").epochSeconds

  const prettyHeader = claims === null ? "" : JSON.stringify(claims.header, null, 2)
  const prettyPayload = claims === null ? "" : JSON.stringify(claims.payload, null, 2)

  return (
    <div className="grid gap-4">
      <ToolPanel title="Paste a JSON Web Token">
        <Field
          error={errorMessage === "" ? undefined : errorMessage}
          hint={`Compact form: header.payload.signature, up to ${limitLabel} characters.`}
          htmlFor="jwt-decoder-token"
          label="Encoded token"
        >
          <textarea
            autoComplete="off"
            className="app-input min-h-24 break-all font-mono"
            id="jwt-decoder-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJhbGciOi..."
            spellCheck={false}
            value={token}
          />
        </Field>
      </ToolPanel>

      {claims !== null ? (
        <>
          <p
            aria-live="polite"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-sm font-semibold"
            role="status"
          >
            {expiry === null || expiry.expired === null
              ? "Expiry: no numeric exp claim, so no verdict is possible."
              : expiry.expired
                ? `Expired — the exp claim is before this device's current time (${formatEpochClaim(
                    numericClaim(claims.payload, "exp").epochSeconds ?? 0,
                  )}).`
                : `Active — the exp claim is after this device's current time.`}
          </p>

          <ToolPanel
            title="Decoded header"
            action={<CopyButton label="Copy header" onStatus={setStatus} value={prettyHeader} />}
          >
            <pre className="overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
              {prettyHeader}
            </pre>
          </ToolPanel>

          <ToolPanel
            title="Decoded payload"
            action={<CopyButton label="Copy payload" onStatus={setStatus} value={prettyPayload} />}
          >
            {issuedAtSeconds !== null ? (
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Issued at {formatEpochClaim(issuedAtSeconds)}
              </p>
            ) : null}
            {notBeforeSeconds !== null ? (
              <p className="mb-2 text-xs text-[var(--text-secondary)]">
                Not before {formatEpochClaim(notBeforeSeconds)}
              </p>
            ) : null}
            <pre className="overflow-x-auto rounded-2xl bg-[var(--surface-muted)] p-3 font-mono text-xs leading-5">
              {prettyPayload}
            </pre>
          </ToolPanel>

          <ToolPanel
            title="Signature (undecoded bytes)"
            action={
              <CopyButton
                label="Copy signature"
                onStatus={setStatus}
                value={claims.signatureBase64Url}
              />
            }
          >
            <p className="break-all font-mono text-xs">{claims.signatureBase64Url || "—"}</p>
          </ToolPanel>
        </>
      ) : null}

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
      <p className="text-sm font-semibold text-[var(--text)]">Decoding is not verification.</p>
      <p className="text-xs leading-5 text-[var(--text-secondary)]">
        This tool only decodes and displays the token's header, payload, and signature text. It does
        not check the signature, issuer, audience, revocation, or algorithm. A decoded token is
        untrusted input: anyone can craft one. Verify tokens with a real verifier that holds the
        key. Expiry is compared against this device's clock, which may differ from the server's.
        Tokens pasted here stay on this device and are not saved.
      </p>

      <div>
        <Button
          variant="quiet"
          onClick={() => {
            setToken("")
            setStatus("")
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
