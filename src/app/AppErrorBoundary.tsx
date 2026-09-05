import { Component, type ErrorInfo, type ReactNode } from "react"
import { RotateCcw, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/Button"

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  failed: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Application render failed", error, info.componentStack)
    }
  }

  private reopenCatalog = () => {
    window.location.hash = "#/"
    window.location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="recovery-screen" id="main-content">
        <section aria-labelledby="recovery-title" className="empty-state max-w-xl">
          <ShieldAlert aria-hidden="true" className="text-[var(--danger)]" size={42} />
          <div>
            <h1 className="text-2xl font-extrabold" id="recovery-title">
              Yash Tools needs to reload
            </h1>
            <p className="mt-3 leading-7">
              The interface stopped unexpectedly. Tool input is not uploaded or included in an
              automatic report. Reopen the catalog to recover.
            </p>
          </div>
          <Button onClick={this.reopenCatalog}>
            <RotateCcw aria-hidden="true" size={18} /> Reopen catalog
          </Button>
        </section>
      </main>
    )
  }
}
