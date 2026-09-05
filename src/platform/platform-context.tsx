import { createContext, type PropsWithChildren, useContext } from "react"
import type { PlatformServices } from "@/platform/contracts"
import { platformServices } from "@/platform/services"

const PlatformContext = createContext<PlatformServices | null>(null)

export function PlatformProvider({ children }: PropsWithChildren) {
  return <PlatformContext value={platformServices}>{children}</PlatformContext>
}

export function usePlatform(): PlatformServices {
  const value = useContext(PlatformContext)
  if (!value) throw new Error("usePlatform must be used inside PlatformProvider")
  return value
}
