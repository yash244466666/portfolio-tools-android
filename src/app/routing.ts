export type AppRoute =
  | { screen: "catalog" }
  | { screen: "favorites" }
  | { screen: "recent" }
  | { screen: "settings" }
  | { screen: "tool"; toolId: string }

export function parseHash(hash = window.location.hash): AppRoute {
  const path = hash.replace(/^#\/?/, "").split("?")[0] ?? ""
  if (path === "favorites") return { screen: "favorites" }
  if (path === "recent") return { screen: "recent" }
  if (path === "settings") return { screen: "settings" }
  if (path.startsWith("tool/")) {
    const toolId = decodeURIComponent(path.slice("tool/".length))
    if (toolId) return { screen: "tool", toolId }
  }
  return { screen: "catalog" }
}

export function routeHref(route: AppRoute): string {
  switch (route.screen) {
    case "catalog":
      return "#/"
    case "favorites":
      return "#/favorites"
    case "recent":
      return "#/recent"
    case "settings":
      return "#/settings"
    case "tool":
      return `#/tool/${encodeURIComponent(route.toolId)}`
  }
}

export function navigate(route: AppRoute, replace = false): void {
  const href = routeHref(route)
  if (replace) window.location.replace(href)
  else window.location.hash = href.slice(1)
}
