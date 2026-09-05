import { CircleCheck, CloudOff, Heart, Search, Wifi } from "lucide-react"
import { useMemo, useState } from "react"
import { routeHref } from "@/app/routing"
import type { NetworkState } from "@/platform/contracts"
import { isEnabledTool, toolCategories, tools } from "@/tools/registry"
import type { ToolCategoryId, ToolDefinition } from "@/tools/types"

interface CatalogScreenProps {
  favorites: string[]
  mode?: "catalog" | "favorites"
  network: NetworkState
  onToggleFavorite: (toolId: string) => void
}

function ToolCard({
  tool,
  favorite,
  onToggleFavorite,
}: {
  tool: ToolDefinition
  favorite: boolean
  onToggleFavorite: (id: string) => void
}) {
  const Icon = tool.icon
  const enabled = isEnabledTool(tool)

  return (
    <article className="tool-card" data-enabled={enabled}>
      <div className="flex items-start justify-between gap-3">
        <div className="tool-icon">
          <Icon aria-hidden="true" size={22} />
        </div>
        <div className="flex items-center gap-2">
          {tool.network ? (
            <span className="status-chip">
              <Wifi aria-hidden="true" size={14} /> Network
            </span>
          ) : (
            <span className="status-chip">
              <CloudOff aria-hidden="true" size={14} /> Offline
            </span>
          )}
          {enabled ? (
            <button
              aria-label={
                favorite ? `Remove ${tool.label} from favorites` : `Add ${tool.label} to favorites`
              }
              aria-pressed={favorite}
              className="icon-button"
              onClick={() => onToggleFavorite(tool.id)}
              type="button"
            >
              <Heart aria-hidden="true" fill={favorite ? "currentColor" : "none"} size={20} />
            </button>
          ) : null}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-[var(--text)]">
          {enabled ? (
            <a className="card-link" href={routeHref({ screen: "tool", toolId: tool.id })}>
              {tool.label}
            </a>
          ) : (
            tool.label
          )}
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{tool.description}</p>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="text-xs font-medium capitalize text-[var(--text-tertiary)]">
          {tool.category}
        </span>
        {enabled ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--success-text)]">
            <CircleCheck aria-hidden="true" size={15} /> Ready
          </span>
        ) : (
          <span className="text-xs font-semibold text-[var(--text-tertiary)]">Vertical slice</span>
        )}
      </div>
    </article>
  )
}

export function CatalogScreen({
  favorites,
  mode = "catalog",
  network,
  onToggleFavorite,
}: CatalogScreenProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ToolCategoryId | "all">("all")

  const visibleTools = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return tools.filter((tool) => {
      if (mode === "favorites" && !favorites.includes(tool.id)) return false
      if (category !== "all" && tool.category !== category) return false
      if (!normalized) return true
      return [tool.label, tool.description, tool.category, ...tool.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized)
    })
  }, [category, favorites, mode, query])

  const enabledCount = tools.filter(isEnabledTool).length
  const heading = mode === "favorites" ? "Favorite tools" : "Useful tools, ready when you are"

  return (
    <div className="screen-content">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Private by default · Android foundation</p>
          <h1 className="screen-title" tabIndex={-1}>
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            {mode === "favorites"
              ? "Your device-local shortcuts. Favorites never require an account."
              : "Fast developer and everyday utilities. Offline tools process input on this device; network tools are labeled."}
          </p>
        </div>
        <div
          className="foundation-stat"
          aria-label={`${enabledCount} tools enabled in the foundation`}
        >
          <strong>{enabledCount}</strong>
          <span>foundation tools ready</span>
        </div>
      </header>

      {!network.connected ? (
        <div className="offline-banner" role="status">
          <CloudOff aria-hidden="true" size={18} /> You are offline. Local tools remain available.
        </div>
      ) : null}

      <div className="sticky-controls">
        <label className="search-field">
          <Search aria-hidden="true" size={20} />
          <span className="sr-only">Search tools</span>
          <input
            autoCapitalize="none"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tools"
            type="search"
            value={query}
          />
        </label>
        <div className="category-scroller" aria-label="Filter by category">
          <button
            aria-pressed={category === "all"}
            className="filter-chip"
            onClick={() => setCategory("all")}
            type="button"
          >
            All
          </button>
          {toolCategories.map((item) => (
            <button
              aria-pressed={category === item.id}
              className="filter-chip"
              key={item.id}
              onClick={() => setCategory(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {visibleTools.length ? (
        <div className="tool-grid" aria-live="polite">
          {visibleTools.map((tool) => (
            <ToolCard
              favorite={favorites.includes(tool.id)}
              key={tool.id}
              onToggleFavorite={onToggleFavorite}
              tool={tool}
            />
          ))}
        </div>
      ) : (
        <section className="empty-state">
          <Search aria-hidden="true" size={28} />
          <h2 className="text-lg font-bold">No matching tools</h2>
          <p>
            {mode === "favorites" && favorites.length === 0
              ? "Add a favorite from the Tools screen."
              : "Try another search or category."}
          </p>
          <a className="text-link" href={routeHref({ screen: "catalog" })}>
            Browse all tools
          </a>
        </section>
      )}
    </div>
  )
}
