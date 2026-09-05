import { Capacitor } from "@capacitor/core"
import { capacitorPlatformServices } from "@/platform/capacitor/services"
import type { PlatformServices } from "@/platform/contracts"
import { webPlatformServices } from "@/platform/web/services"

export const platformServices: PlatformServices = Capacitor.isNativePlatform()
  ? capacitorPlatformServices
  : webPlatformServices
