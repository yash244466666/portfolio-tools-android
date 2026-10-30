import { type ButtonHTMLAttributes, forwardRef } from "react"

type ButtonVariant = "primary" | "secondary" | "quiet" | "danger"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]",
  secondary:
    "border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text)] hover:bg-[var(--surface-hover)]",
  quiet:
    "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]",
  danger: "bg-[var(--danger)] text-white hover:bg-[var(--danger-hover)]",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", type = "button", variant = "primary", fullWidth = false, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-[background-color,color,border-color,transform] duration-[var(--motion-base)] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    />
  )
})
