import "@/platform/shared/promise-try-polyfill"
import "@/platform/shared/typed-array-methods-polyfill"
import "@/platform/shared/map-upsert-polyfill"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "@/app/App"
import { AppErrorBoundary } from "@/app/AppErrorBoundary"
import { PlatformProvider } from "@/platform/platform-context"
import "@/styles.css"

const root = document.getElementById("root")
if (!root) throw new Error("Application root element is missing")

createRoot(root).render(
  <StrictMode>
    <AppErrorBoundary>
      <PlatformProvider>
        <App />
      </PlatformProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
