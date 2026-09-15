import { CircleCheck, CloudOff, Heart, History, Search, Trash2, Wifi, X } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { routeHref } from "@/app/routing"
import { Button } from "@/components/ui/Button"
import type { NetworkState } from "@/platform/contracts"
import { getTool, isEnabledTool, toolCategories, tools } from "@/tools/registry"
import type { ToolCategoryId, ToolDefinition } from "@/tools/types"

interface CatalogScreenProps {
  favorites: string[]
  mode?: "catalog" | "favorites" | "recent"
  network: NetworkState
  recents?: string[]
  onClearRecents?: () => void
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
  recents = [],
  onClearRecents,
  onToggleFavorite,
}: CatalogScreenProps) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ToolCategoryId | "all">("all")
  const searchRef = useRef<HTMLInputElement>(null)

  function clearQuery() {
    setQuery("")
    searchRef.current?.focus()
  }

  const visibleTools = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    // Only the release scope is browsable. Before ADR 0023 every registry entry was
    // `enabled`, so listing `tools` wholesale was equivalent; now the registry also holds
    // the 70 `removed` entries, and a cut tool must never appear as an openable card.
    const availableTools =
      mode === "recent"
        ? recents
            .map((id) => getTool(id))
            .filter((tool): tool is ToolDefinition => Boolean(tool && isEnabledTool(tool)))
        : tools.filter(isEnabledTool)

    return availableTools.filter((tool) => {
      if (mode === "favorites" && !favorites.includes(tool.id)) return false
      if (category !== "all" && tool.category !== category) return false
      if (!normalized) return true
      return [tool.label, tool.description, tool.category, ...tool.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalized)
    })
  }, [category, favorites, mode, query, recents])

  const enabledCount = tools.filter(isEnabledTool).length
  const favoriteCount = tools.filter(
    (tool) => isEnabledTool(tool) && favorites.includes(tool.id),
  ).length
  const recentCount = recents.filter((id) => {
    const tool = getTool(id)
    return Boolean(tool && isEnabledTool(tool))
  }).length
  const heading =
    mode === "favorites"
      ? "Favorite tools"
      : mode === "recent"
        ? "Recent tools"
        : "Useful tools, ready when you are"
  const summary =
    mode === "favorites"
      ? "Your device-local shortcuts. Favorites never require an account."
      : mode === "recent"
        ? "Quickly return to tools opened on this installation. Recent history stays on this device."
        : "Fast developer and everyday utilities. Offline tools process input on this device; network tools are labeled."
  const stat =
    mode === "favorites"
      ? {
          count: favoriteCount,
          label: favoriteCount === 1 ? "favorite tool saved" : "favorite tools saved",
          accessibleLabel: `${favoriteCount} ${favoriteCount === 1 ? "favorite tool saved" : "favorite tools saved"}`,
        }
      : mode === "recent"
        ? {
            count: recentCount,
            label: recentCount === 1 ? "recent tool on this device" : "recent tools on this device",
            accessibleLabel: `${recentCount} ${recentCount === 1 ? "recent tool on this device" : "recent tools on this device"}`,
          }
        : {
            count: enabledCount,
            label: "foundation tools ready",
            accessibleLabel: `${enabledCount} tools enabled in the foundation`,
          }

  return (
    <div className="screen-content">
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Private by default · Android foundation</p>
          <h1 className="screen-title" tabIndex={-1}>
            {heading}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--text-secondary)]">
            {summary}
          </p>
        </div>
        <div className="grid justify-items-start gap-2 md:justify-items-end">
          <div className="foundation-stat" aria-label={stat.accessibleLabel}>
            <strong>{stat.count}</strong>
            <span>{stat.label}</span>
          </div>
          {mode === "recent" && recentCount > 0 && onClearRecents ? (
            <Button onClick={onClearRecents} variant="quiet">
              <Trash2 aria-hidden="true" size={18} /> Clear recent history
            </Button>
          ) : null}
        </div>
      </header>

      {!network.connected ? (
        <div className="offline-banner" role="status">
          <CloudOff aria-hidden="true" size={18} /> You are offline. Local tools remain available.
        </div>
      ) : null}

      <div className="sticky-controls">
        <div className="search-field">
          <Search aria-hidden="true" size={20} />
          <label className="sr-only" htmlFor="tool-search">
            Search tools
          </label>
          <input
            autoCapitalize="none"
            id="tool-search"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault()
                clearQuery()
              }
            }}
            placeholder="Search tools"
            ref={searchRef}
            type="search"
            value={query}
          />
          {query ? (
            <button
              aria-label="Clear search"
              className="icon-button search-clear"
              onClick={clearQuery}
              type="button"
            >
              <X aria-hidden="true" size={18} />
            </button>
          ) : null}
        </div>
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
      ) : mode === "favorites" && favorites.length === 0 ? (
        <section className="empty-state">
          <Heart aria-hidden="true" size={28} />
          <h2 className="text-lg font-bold">No favorites yet</h2>
          <p>
            Tap the heart on any tool card to keep it here. Favorites are stored only on this
            device.
          </p>
          <a className="text-link" href={routeHref({ screen: "catalog" })}>
            Browse all tools
          </a>
        </section>
      ) : mode === "recent" && recentCount === 0 ? (
        <section className="empty-state">
          <History aria-hidden="true" size={28} />
          <h2 className="text-lg font-bold">No recent tools yet</h2>
          <p>Open any tool and it will appear here. Recent history stays on this device.</p>
          <a className="text-link" href={routeHref({ screen: "catalog" })}>
            Browse all tools
          </a>
        </section>
      ) : (
        <section className="empty-state">
          <Search aria-hidden="true" size={28} />
          <h2 className="text-lg font-bold">No matching tools</h2>
          <p>Try another search or category.</p>
          <a className="text-link" href={routeHref({ screen: "catalog" })}>
            Browse all tools
          </a>
        </section>
      )}
    </div>
  )
}
