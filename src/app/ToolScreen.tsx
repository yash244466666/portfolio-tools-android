import { ArrowLeft, Construction, Home } from "lucide-react"
import { Suspense, useEffect, useRef } from "react"
import { routeHref } from "@/app/routing"
import { getTool, isEnabledTool } from "@/tools/registry"

export function ToolScreen({
  toolId,
  onOpened,
}: {
  toolId: string
  onOpened: (id: string) => void
}) {
  const titleRef = useRef<HTMLHeadingElement>(null)
  const tool = getTool(toolId)

  useEffect(() => {
    if (tool && isEnabledTool(tool)) onOpened(tool.id)
    titleRef.current?.focus()
  }, [onOpened, tool])

  if (!tool) {
    return (
      <section className="empty-state screen-content">
        <Home aria-hidden="true" size={30} />
        <h1 className="text-2xl font-bold" ref={titleRef} tabIndex={-1}>
          Tool not found
        </h1>
        <p>This link does not match a tool in the current release manifest.</p>
        <a className="text-link" href={routeHref({ screen: "catalog" })}>
          Return to tools
        </a>
      </section>
    )
  }

  const Icon = tool.icon

  if (!isEnabledTool(tool) || !tool.component) {
    return (
      <div className="screen-content">
        <a className="back-link" href={routeHref({ screen: "catalog" })}>
          <ArrowLeft aria-hidden="true" size={19} /> Tools
        </a>
        <section className="empty-state mt-4">
          <Construction aria-hidden="true" size={30} />
          <h1 className="text-2xl font-bold" ref={titleRef} tabIndex={-1}>
            {tool.label}
          </h1>
          <p>
            This tool is part of the vertical-slice backlog and is not enabled in this build yet.
          </p>
          <a className="text-link" href={routeHref({ screen: "catalog" })}>
            Browse ready tools
          </a>
        </section>
      </div>
    )
  }

  const ToolComponent = tool.component

  return (
    <div className="screen-content tool-screen">
      <a className="back-link" href={routeHref({ screen: "catalog" })}>
        <ArrowLeft aria-hidden="true" size={19} /> Tools
      </a>
      <header className="tool-heading">
        <div className="tool-icon large">
          <Icon aria-hidden="true" size={26} />
        </div>
        <div className="tool-heading-text">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">{tool.network ? "Network tool" : "Works offline"}</p>
            <span className="risk-badge">{tool.risk} risk</span>
          </div>
          <h1
            className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl"
            ref={titleRef}
            tabIndex={-1}
          >
            {tool.label}
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-[var(--text-secondary)]">
            {tool.description}
          </p>
        </div>
      </header>
      <Suspense
        fallback={
          <div className="loading-panel" role="status">
            Loading tool…
          </div>
        }
      >
        <ToolComponent />
      </Suspense>
    </div>
  )
}
