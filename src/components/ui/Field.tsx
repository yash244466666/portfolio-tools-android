import type { PropsWithChildren, ReactNode } from "react"

interface FieldProps extends PropsWithChildren {
  label: string
  htmlFor: string
  hint?: ReactNode
  error?: string
}

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const hintId = `${htmlFor}-hint`
  const errorId = `${htmlFor}-error`

  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-[var(--text)]" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-xs leading-5 text-[var(--text-secondary)]" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-[var(--danger-text)]" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
