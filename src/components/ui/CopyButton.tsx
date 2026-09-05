import { Check, Copy } from "lucide-react"
import { useEffect, useState } from "react"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import { Button } from "@/components/ui/Button"

interface CopyButtonProps {
  value: string
  label?: string
  sensitive?: boolean
  onStatus?: (message: string) => void
}

export function CopyButton({
  value,
  label = "Copy",
  sensitive = false,
  onStatus,
}: CopyButtonProps) {
  const { clipboard, haptics } = usePlatform()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timeout)
  }, [copied])

  async function copy() {
    try {
      await clipboard.writeText(
        value,
        sensitive ? { sensitive: true, clearAfterMs: 60_000 } : undefined,
      )
      setCopied(true)
      onStatus?.("Copied to clipboard.")
      await haptics.confirm()
    } catch (error) {
      onStatus?.(toSafeErrorMessage(error))
    }
  }

  return (
    <Button aria-label={`${label} result`} onClick={() => void copy()} variant="quiet">
      {copied ? <Check aria-hidden="true" size={18} /> : <Copy aria-hidden="true" size={18} />}
      {copied ? "Copied" : label}
    </Button>
  )
}
