import {
  CircleHelp,
  Database,
  ExternalLink,
  Moon,
  ShieldCheck,
  Smartphone,
  Sun,
} from "lucide-react"
import type { ThemePreference } from "@/app/useAppState"
import { Button } from "@/components/ui/Button"
import { ToolPanel } from "@/components/ui/ToolPanel"
import type { PlatformKind } from "@/platform/contracts"
import { usePlatform } from "@/platform/platform-context"
import { isEnabledTool, tools } from "@/tools/registry"

const enabledToolCount = tools.filter(isEnabledTool).length

interface SettingsScreenProps {
  platform: PlatformKind
  theme: ThemePreference
  onThemeChange: (value: ThemePreference) => void
  onClearPreferences: () => Promise<void>
}

export function SettingsScreen({
  platform,
  theme,
  onThemeChange,
  onClearPreferences,
}: SettingsScreenProps) {
  const { browser } = usePlatform()

  function openSupportSite() {
    void browser.open(new URL("https://yashsikdar.com"))
  }

  return (
    <div className="screen-content">
      <header>
        <p className="eyebrow">Settings & information</p>
        <h1 className="screen-title" tabIndex={-1}>
          Your app, your device
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-[var(--text-secondary)]">
          This device can store your theme, favorites, recent-tool IDs, the scratchpad note, saved
          bookmarks, Pomodoro timer state, and cached exchange rates. Every other tool keeps its
          input in memory only and never saves it automatically.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <ToolPanel title="Appearance">
          <fieldset>
            <legend className="sr-only">Color theme</legend>
            <div className="segmented-control three">
              {(
                [
                  ["system", Smartphone, "System"],
                  ["light", Sun, "Light"],
                  ["dark", Moon, "Dark"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  aria-pressed={theme === value}
                  className="segment"
                  key={value}
                  onClick={() => onThemeChange(value)}
                  type="button"
                >
                  <Icon aria-hidden="true" size={18} /> {label}
                </button>
              ))}
            </div>
          </fieldset>
        </ToolPanel>

        <ToolPanel title="Local data">
          <div className="flex items-start gap-3">
            <Database
              aria-hidden="true"
              className="mt-1 shrink-0 text-[var(--primary)]"
              size={22}
            />
            <div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">
                Clear local data from this installation. This removes favorites, recents, theme,
                your saved scratchpad note, your saved bookmarks, your saved Pomodoro timer state,
                and cached exchange rates. The confirmation states exactly how many of each will be
                removed. Notes and bookmarks are stored unencrypted and are not recoverable after
                clearing.
              </p>
              <Button className="mt-4" onClick={() => void onClearPreferences()} variant="danger">
                Clear local preferences
              </Button>
            </div>
          </div>
        </ToolPanel>

        <ToolPanel title="Privacy foundation">
          <div className="flex items-start gap-3">
            <ShieldCheck
              aria-hidden="true"
              className="mt-1 shrink-0 text-[var(--success-text)]"
              size={22}
            />
            <ul className="grid gap-2 text-sm leading-6 text-[var(--text-secondary)]">
              <li>No account, ads, analytics, or automatic crash uploads.</li>
              <li>
                Most enabled tools work offline and process input on this device. Currency Converter
                and DNS Lookup are labeled in the catalog as requiring internet.
              </li>
              <li>
                Currency Converter sends only the selected base currency code to Frankfurter
                (api.frankfurter.dev); amounts never leave this device.
              </li>
              <li>
                DNS Lookup sends only the queried domain name and record type to Cloudflare
                (cloudflare-dns.com); lookups are not stored by this app.
              </li>
              <li>Android backup exclusions are configured for app-private data.</li>
            </ul>
          </div>
        </ToolPanel>

        <ToolPanel title="Build information">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-[var(--text-secondary)]">Version</dt>
            <dd className="font-mono">0.1.0</dd>
            <dt className="text-[var(--text-secondary)]">Platform</dt>
            <dd className="capitalize">{platform}</dd>
            <dt className="text-[var(--text-secondary)]">Manifest</dt>
            <dd>Foundation v1</dd>
            <dt className="text-[var(--text-secondary)]">Enabled tools</dt>
            <dd>{enabledToolCount}</dd>
          </dl>
        </ToolPanel>

        <ToolPanel title="Help and project status">
          <div className="flex items-start gap-3">
            <CircleHelp
              aria-hidden="true"
              className="mt-1 shrink-0 text-[var(--primary)]"
              size={22}
            />
            <div className="grid gap-3 text-sm leading-6 text-[var(--text-secondary)]">
              <p>
                Implementation progress, known limitations, physical-device checks, and release
                gates are maintained in the repository documentation.
              </p>
              <button className="text-link gap-1 text-left" onClick={openSupportSite} type="button">
                Portfolio and support site <ExternalLink aria-hidden="true" size={15} />
              </button>
            </div>
          </div>
        </ToolPanel>
      </div>
    </div>
  )
}
