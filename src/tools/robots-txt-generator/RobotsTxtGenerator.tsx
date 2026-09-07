import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import {
  buildRobotsTxt,
  maximumAgentChars,
  maximumGroups,
  maximumPathChars,
  maximumRulesPerType,
  newGroupId,
  newRuleId,
  type UserAgentGroup,
} from "./robots"

export default function RobotsTxtGenerator() {
  const [groups, setGroups] = useState<UserAgentGroup[]>([
    {
      id: "1",
      userAgent: "*",
      allowRules: [{ id: "1-allow-1", path: "/" }],
      disallowRules: [{ id: "1-disallow-1", path: "/admin/" }],
    },
  ])
  const [sitemapUrl, setSitemapUrl] = useState("https://example.com/sitemap.xml")
  const [status, setStatus] = useState("")

  const robotsTxt = buildRobotsTxt(groups, sitemapUrl)
  const sitemapValid =
    sitemapUrl.trim() === "" ||
    (sitemapUrl.trim().startsWith("https://") && !/\s/.test(sitemapUrl.trim()))

  function addGroup() {
    setGroups((previous) =>
      previous.length >= maximumGroups
        ? previous
        : [
            ...previous,
            {
              id: newGroupId(previous),
              userAgent: "",
              allowRules: [],
              disallowRules: [],
            },
          ],
    )
  }

  function removeGroup(id: string) {
    setGroups((previous) => previous.filter((group) => group.id !== id))
  }

  function updateAgent(id: string, userAgent: string) {
    setGroups((previous) =>
      previous.map((group) => (group.id === id ? { ...group, userAgent } : group)),
    )
  }

  function addRule(id: string, ruleType: "allowRules" | "disallowRules") {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === id && group[ruleType].length < maximumRulesPerType
          ? {
              ...group,
              [ruleType]: [...group[ruleType], { id: newRuleId(group, ruleType), path: "" }],
            }
          : group,
      ),
    )
  }

  function removeRule(groupId: string, ruleType: "allowRules" | "disallowRules", ruleId: string) {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === groupId
          ? { ...group, [ruleType]: group[ruleType].filter((rule) => rule.id !== ruleId) }
          : group,
      ),
    )
  }

  function updateRule(
    groupId: string,
    ruleType: "allowRules" | "disallowRules",
    ruleId: string,
    path: string,
  ) {
    setGroups((previous) =>
      previous.map((group) =>
        group.id === groupId
          ? {
              ...group,
              [ruleType]: group[ruleType].map((rule) =>
                rule.id === ruleId ? { ...rule, path } : rule,
              ),
            }
          : group,
      ),
    )
  }

  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <ToolPanel key={group.id} title={`Group: ${group.userAgent.trim() || "unnamed"}`}>
          <Field
            error={
              group.userAgent.length > maximumAgentChars
                ? `The user-agent exceeds the ${maximumAgentChars} character limit.`
                : undefined
            }
            htmlFor={`robots-agent-${group.id}`}
            label="User-agent"
            hint="A product token such as * for every crawler or Googlebot."
          >
            <input
              className="app-input font-mono"
              id={`robots-agent-${group.id}`}
              onChange={(event) => updateAgent(group.id, event.target.value)}
              placeholder="* or Googlebot"
              value={group.userAgent}
            />
          </Field>

          <div className="mt-3 grid gap-2">
            <span className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
              Allow
            </span>
            {group.allowRules.map((rule) => (
              <div className="flex items-end gap-2" key={rule.id}>
                <div className="flex-1">
                  <input
                    aria-label={`Allow path ${rule.id}`}
                    className="app-input font-mono"
                    maxLength={maximumPathChars}
                    onChange={(event) =>
                      updateRule(group.id, "allowRules", rule.id, event.target.value)
                    }
                    placeholder="/path/"
                    value={rule.path}
                  />
                </div>
                <Button
                  aria-label={`Remove allow rule ${rule.path || "without a path"}`}
                  onClick={() => removeRule(group.id, "allowRules", rule.id)}
                  variant="quiet"
                >
                  Remove
                </Button>
              </div>
            ))}
            {group.allowRules.length < maximumRulesPerType ? (
              <Button onClick={() => addRule(group.id, "allowRules")} variant="secondary">
                Add allow rule
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2">
            <span className="text-xs font-semibold tracking-wider text-[var(--text-secondary)] uppercase">
              Disallow
            </span>
            {group.disallowRules.map((rule) => (
              <div className="flex items-end gap-2" key={rule.id}>
                <div className="flex-1">
                  <input
                    aria-label={`Disallow path ${rule.id}`}
                    className="app-input font-mono"
                    maxLength={maximumPathChars}
                    onChange={(event) =>
                      updateRule(group.id, "disallowRules", rule.id, event.target.value)
                    }
                    placeholder="/private/"
                    value={rule.path}
                  />
                </div>
                <Button
                  aria-label={`Remove disallow rule ${rule.path || "without a path"}`}
                  onClick={() => removeRule(group.id, "disallowRules", rule.id)}
                  variant="quiet"
                >
                  Remove
                </Button>
              </div>
            ))}
            {group.disallowRules.length < maximumRulesPerType ? (
              <Button onClick={() => addRule(group.id, "disallowRules")} variant="secondary">
                Add disallow rule
              </Button>
            ) : null}
          </div>

          {groups.length > 1 ? (
            <Button className="mt-3" onClick={() => removeGroup(group.id)} variant="danger">
              Remove this group
            </Button>
          ) : null}
        </ToolPanel>
      ))}

      <Button
        disabled={groups.length >= maximumGroups}
        fullWidth
        onClick={addGroup}
        variant="secondary"
      >
        Add user-agent group
      </Button>

      <ToolPanel title="Sitemap">
        <Field
          error={
            sitemapValid
              ? undefined
              : "Enter an https:// sitemap URL without spaces, or clear the field."
          }
          htmlFor="robots-sitemap"
          label="Sitemap URL"
          hint="Optional; clear the field to omit the Sitemap line."
        >
          <input
            className="app-input font-mono"
            id="robots-sitemap"
            onChange={(event) => setSitemapUrl(event.target.value)}
            placeholder="https://example.com/sitemap.xml"
            value={sitemapUrl}
          />
        </Field>
      </ToolPanel>

      <ToolPanel
        action={<CopyButton label="Copy" onStatus={setStatus} value={robotsTxt} />}
        title="robots.txt"
      >
        {robotsTxt ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-sm">{robotsTxt}</pre>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            Add a user-agent and rules above to generate the file.
          </p>
        )}
        <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
          robots.txt is advisory; well-behaved crawlers respect it, but anything that ignores it can
          still request the listed paths. It does not hide content or require authentication.
        </p>
      </ToolPanel>

      <p aria-live="polite" className="sr-only" role="status">
        {status}
      </p>
    </div>
  )
}
