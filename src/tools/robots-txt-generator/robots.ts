export interface RobotsRule {
  id: string
  path: string
}

export interface UserAgentGroup {
  id: string
  userAgent: string
  allowRules: RobotsRule[]
  disallowRules: RobotsRule[]
}

export const maximumGroups = 20
export const maximumRulesPerType = 50
export const maximumPathChars = 500
export const maximumAgentChars = 100

export function newGroupId(groups: readonly UserAgentGroup[]): string {
  const used = new Set(groups.map((group) => group.id))
  let index = 1
  while (used.has(String(index))) index += 1
  return String(index)
}

export function newRuleId(group: UserAgentGroup, ruleType: "allowRules" | "disallowRules"): string {
  const used = new Set(group[ruleType].map((rule) => rule.id))
  let index = 1
  while (used.has(`${group.id}-${ruleType === "allowRules" ? "allow" : "disallow"}-${index}`)) {
    index += 1
  }
  return `${group.id}-${ruleType === "allowRules" ? "allow" : "disallow"}-${index}`
}

/**
 * Renders the robots.txt content. Groups without a user-agent and rules
 * without a path are skipped, matching the upstream: an empty rule is an
 * in-progress entry, while a group with a user-agent and no rules at all
 * still renders because the directive alone is a valid statement.
 */
export function buildRobotsTxt(groups: readonly UserAgentGroup[], sitemapUrl: string): string {
  const lines: string[] = []
  for (const group of groups) {
    const agent = group.userAgent.trim()
    if (!agent) continue
    lines.push(`User-agent: ${agent}`)
    for (const rule of group.allowRules) {
      if (rule.path.trim()) lines.push(`Allow: ${rule.path.trim()}`)
    }
    for (const rule of group.disallowRules) {
      if (rule.path.trim()) lines.push(`Disallow: ${rule.path.trim()}`)
    }
    lines.push("")
  }
  const sitemap = sitemapUrl.trim()
  if (sitemap) lines.push(`Sitemap: ${sitemap}`)
  return lines.join("\n").trim()
}
