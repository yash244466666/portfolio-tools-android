import { describe, expect, it } from "vitest"
import {
  buildRobotsTxt,
  maximumGroups,
  maximumRulesPerType,
  newGroupId,
  newRuleId,
  type UserAgentGroup,
} from "./robots"

const baseGroup: UserAgentGroup = {
  id: "1",
  userAgent: "*",
  allowRules: [{ id: "1-allow-1", path: "/" }],
  disallowRules: [{ id: "1-disallow-1", path: "/admin/" }],
}

describe("buildRobotsTxt", () => {
  it("renders the default group with rules and a sitemap", () => {
    const text = buildRobotsTxt([baseGroup], "https://example.com/sitemap.xml")
    expect(text).toBe(
      "User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: https://example.com/sitemap.xml",
    )
  })

  it("skips a group without a user-agent", () => {
    const text = buildRobotsTxt([{ ...baseGroup, userAgent: "" }], "")
    expect(text).toBe("")
  })

  it("skips rules with empty paths", () => {
    const text = buildRobotsTxt(
      [
        {
          ...baseGroup,
          allowRules: [{ id: "a", path: "" }],
          disallowRules: [{ id: "b", path: "/x" }],
        },
      ],
      "",
    )
    expect(text).toBe("User-agent: *\nDisallow: /x")
  })

  it("renders a group with a user-agent but no rules", () => {
    const text = buildRobotsTxt([{ ...baseGroup, allowRules: [], disallowRules: [] }], "")
    expect(text).toBe("User-agent: *")
  })

  it("omits the sitemap line when the URL is blank", () => {
    const text = buildRobotsTxt([baseGroup], "   ")
    expect(text).toBe("User-agent: *\nAllow: /\nDisallow: /admin/")
  })

  it("renders multiple groups in order", () => {
    const second: UserAgentGroup = {
      id: "2",
      userAgent: "Googlebot",
      allowRules: [],
      disallowRules: [{ id: "2-disallow-1", path: "/internal/" }],
    }
    const text = buildRobotsTxt([baseGroup, second], "")
    expect(text).toContain("User-agent: *")
    expect(text).toContain("User-agent: Googlebot")
    expect(text.indexOf("User-agent: *")).toBeLessThan(text.indexOf("User-agent: Googlebot"))
  })
})

describe("newGroupId and newRuleId", () => {
  it("generates a unique group id", () => {
    expect(newGroupId([baseGroup])).toBe("2")
    expect(newGroupId([{ ...baseGroup, id: "2" }])).toBe("1")
  })

  it("generates a unique rule id within the group", () => {
    expect(newRuleId(baseGroup, "allowRules")).toBe("1-allow-2")
    expect(newRuleId(baseGroup, "disallowRules")).toBe("1-disallow-2")
  })

  it("documents the bounds", () => {
    expect(maximumGroups).toBe(20)
    expect(maximumRulesPerType).toBe(50)
  })
})
