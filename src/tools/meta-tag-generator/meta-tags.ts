export const maximumMetaFieldChars = 300

export const ogTypeOptions = ["website", "article", "profile", "video.movie", "music.song"] as const

export type OgType = (typeof ogTypeOptions)[number]

export const twitterCardOptions = ["summary", "summary_large_image"] as const

export type TwitterCard = (typeof twitterCardOptions)[number]

export interface MetaTagInput {
  title: string
  description: string
  keywords: string
  author: string
  viewport: string
  robots: string
  canonical: string
  ogType: OgType
  ogTitle: string
  ogDescription: string
  ogImage: string
  ogUrl: string
  twCard: TwitterCard
  twTitle: string
  twDescription: string
  twImage: string
}

export const defaultMetaTagInput: MetaTagInput = {
  title: "",
  description: "",
  keywords: "",
  author: "",
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  canonical: "",
  ogType: "website",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogUrl: "",
  twCard: "summary_large_image",
  twTitle: "",
  twDescription: "",
  twImage: "",
}

/**
 * Escapes a value for safe use inside a double-quoted HTML attribute or
 * element text. The upstream generator interpolated raw values, so a
 * quote in a title broke or silently rewrote the generated markup.
 */
export function escapeMetaHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

/**
 * Builds the generated meta-tag HTML from the form state, mirroring the
 * upstream line order: primary tags, then Open Graph when any OG field is
 * set, then Twitter when any Twitter field is set. Empty optional fields
 * are omitted; viewport and robots are emitted while non-empty.
 */
export function buildMetaTags(input: MetaTagInput): string {
  const lines: string[] = []
  lines.push("<!-- Primary Meta Tags -->")
  if (input.title) {
    lines.push(`<title>${escapeMetaHtml(input.title)}</title>`)
  }
  if (input.description) {
    lines.push(`<meta name="description" content="${escapeMetaHtml(input.description)}" />`)
  }
  if (input.keywords) {
    lines.push(`<meta name="keywords" content="${escapeMetaHtml(input.keywords)}" />`)
  }
  if (input.author) {
    lines.push(`<meta name="author" content="${escapeMetaHtml(input.author)}" />`)
  }
  if (input.viewport) {
    lines.push(`<meta name="viewport" content="${escapeMetaHtml(input.viewport)}" />`)
  }
  if (input.robots) {
    lines.push(`<meta name="robots" content="${escapeMetaHtml(input.robots)}" />`)
  }
  if (input.canonical) {
    lines.push(`<link rel="canonical" href="${escapeMetaHtml(input.canonical)}" />`)
  }

  if (input.ogTitle || input.ogDescription || input.ogImage || input.ogUrl) {
    lines.push("")
    lines.push("<!-- Open Graph / Facebook -->")
    lines.push(`<meta property="og:type" content="${escapeMetaHtml(input.ogType)}" />`)
    if (input.ogTitle) {
      lines.push(`<meta property="og:title" content="${escapeMetaHtml(input.ogTitle)}" />`)
    }
    if (input.ogDescription) {
      lines.push(
        `<meta property="og:description" content="${escapeMetaHtml(input.ogDescription)}" />`,
      )
    }
    if (input.ogImage) {
      lines.push(`<meta property="og:image" content="${escapeMetaHtml(input.ogImage)}" />`)
    }
    if (input.ogUrl) {
      lines.push(`<meta property="og:url" content="${escapeMetaHtml(input.ogUrl)}" />`)
    }
  }

  if (input.twTitle || input.twDescription || input.twImage) {
    lines.push("")
    lines.push("<!-- Twitter -->")
    lines.push(`<meta name="twitter:card" content="${escapeMetaHtml(input.twCard)}" />`)
    if (input.twTitle) {
      lines.push(`<meta name="twitter:title" content="${escapeMetaHtml(input.twTitle)}" />`)
    }
    if (input.twDescription) {
      lines.push(
        `<meta name="twitter:description" content="${escapeMetaHtml(input.twDescription)}" />`,
      )
    }
    if (input.twImage) {
      lines.push(`<meta name="twitter:image" content="${escapeMetaHtml(input.twImage)}" />`)
    }
  }

  return lines.join("\n")
}

export function hasAnyMetaTagContent(input: MetaTagInput): boolean {
  return (
    (
      input.title ||
      input.description ||
      input.keywords ||
      input.author ||
      input.viewport ||
      input.robots ||
      input.canonical ||
      input.ogTitle ||
      input.ogDescription ||
      input.ogImage ||
      input.ogUrl ||
      input.twTitle ||
      input.twDescription ||
      input.twImage
    ).trim().length > 0
  )
}
