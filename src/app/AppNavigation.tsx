import { Heart, History, LibraryBig, Settings2, Wrench } from "lucide-react"
import type { AppRoute } from "@/app/routing"
import { routeHref } from "@/app/routing"

interface AppNavigationProps {
  route: AppRoute
  favoriteCount: number
}

const navigationItems = [
  { screen: "catalog" as const, label: "Tools", icon: LibraryBig },
  { screen: "favorites" as const, label: "Favorites", icon: Heart },
  { screen: "recent" as const, label: "Recent", icon: History },
  { screen: "settings" as const, label: "Settings", icon: Settings2 },
]

export function AppNavigation({ route, favoriteCount }: AppNavigationProps) {
  const selected = route.screen === "tool" ? "catalog" : route.screen

  return (
    <>
      <div className="navigation-rail">
        <a
          className="brand-mark"
          href={routeHref({ screen: "catalog" })}
          aria-label="Yash Tools home"
        >
          <Wrench aria-hidden="true" size={25} strokeWidth={2.2} />
        </a>
        <nav aria-label="Primary navigation" className="grid gap-2">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isSelected = selected === item.screen
            return (
              <a
                aria-current={isSelected ? "page" : undefined}
                className="rail-link"
                data-selected={isSelected}
                href={routeHref({ screen: item.screen })}
                key={item.screen}
              >
                <Icon aria-hidden="true" size={22} />
                <span>{item.label}</span>
                {item.screen === "favorites" && favoriteCount > 0 ? (
                  <span className="count-badge" aria-label={`${favoriteCount} favorite tools`}>
                    {favoriteCount}
                  </span>
                ) : null}
              </a>
            )
          })}
        </nav>
      </div>

      <nav className="bottom-navigation" aria-label="Primary navigation">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isSelected = selected === item.screen
          return (
            <a
              aria-current={isSelected ? "page" : undefined}
              className="bottom-link"
              data-selected={isSelected}
              href={routeHref({ screen: item.screen })}
              key={item.screen}
            >
              <span className="relative">
                <Icon aria-hidden="true" size={22} />
                {item.screen === "favorites" && favoriteCount > 0 ? (
                  <span className="absolute -right-3 -top-2 rounded-full bg-[var(--primary)] px-1 text-[10px] font-bold text-[var(--on-primary)]">
                    {favoriteCount}
                  </span>
                ) : null}
              </span>
              <span>{item.label}</span>
            </a>
          )
        })}
      </nav>
    </>
  )
}
