export interface MimeTypeEntry {
  extension: string
  mimeType: string
  description: string
}

export const imageMimeTypes: MimeTypeEntry[] = [
  { extension: ".jpg", mimeType: "image/jpeg", description: "JPEG image" },
  { extension: ".jpeg", mimeType: "image/jpeg", description: "JPEG image" },
  { extension: ".png", mimeType: "image/png", description: "PNG image" },
  { extension: ".gif", mimeType: "image/gif", description: "GIF image" },
  { extension: ".svg", mimeType: "image/svg+xml", description: "SVG vector image" },
  { extension: ".webp", mimeType: "image/webp", description: "WebP image" },
  { extension: ".ico", mimeType: "image/x-icon", description: "Icon image" },
  { extension: ".bmp", mimeType: "image/bmp", description: "Bitmap image" },
  { extension: ".tiff", mimeType: "image/tiff", description: "TIFF image" },
  { extension: ".tif", mimeType: "image/tiff", description: "TIFF image" },
  { extension: ".avif", mimeType: "image/avif", description: "AVIF image" },
]

export const videoMimeTypes: MimeTypeEntry[] = [
  { extension: ".mp4", mimeType: "video/mp4", description: "MP4 video" },
  { extension: ".webm", mimeType: "video/webm", description: "WebM video" },
  { extension: ".avi", mimeType: "video/x-msvideo", description: "AVI video" },
  { extension: ".mov", mimeType: "video/quicktime", description: "QuickTime video" },
  { extension: ".wmv", mimeType: "video/x-ms-wmv", description: "Windows Media video" },
  { extension: ".flv", mimeType: "video/x-flv", description: "Flash video" },
  { extension: ".mkv", mimeType: "video/x-matroska", description: "Matroska video" },
  { extension: ".mpeg", mimeType: "video/mpeg", description: "MPEG video" },
  { extension: ".ogv", mimeType: "video/ogg", description: "Ogg video" },
  { extension: ".3gp", mimeType: "video/3gpp", description: "3GPP video" },
]

export const audioMimeTypes: MimeTypeEntry[] = [
  { extension: ".mp3", mimeType: "audio/mpeg", description: "MP3 audio" },
  { extension: ".wav", mimeType: "audio/wav", description: "WAV audio" },
  { extension: ".ogg", mimeType: "audio/ogg", description: "Ogg audio" },
  { extension: ".m4a", mimeType: "audio/mp4", description: "M4A audio" },
  { extension: ".flac", mimeType: "audio/flac", description: "FLAC audio" },
  { extension: ".aac", mimeType: "audio/aac", description: "AAC audio" },
  { extension: ".wma", mimeType: "audio/x-ms-wma", description: "Windows Media audio" },
  { extension: ".aiff", mimeType: "audio/aiff", description: "AIFF audio" },
  { extension: ".opus", mimeType: "audio/opus", description: "Opus audio" },
  { extension: ".mid", mimeType: "audio/midi", description: "MIDI audio" },
  { extension: ".midi", mimeType: "audio/midi", description: "MIDI audio" },
]

export const documentMimeTypes: MimeTypeEntry[] = [
  { extension: ".pdf", mimeType: "application/pdf", description: "PDF document" },
  { extension: ".doc", mimeType: "application/msword", description: "Word document" },
  {
    extension: ".docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    description: "Word document (OOXML)",
  },
  { extension: ".xls", mimeType: "application/vnd.ms-excel", description: "Excel spreadsheet" },
  {
    extension: ".xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    description: "Excel spreadsheet (OOXML)",
  },
  {
    extension: ".ppt",
    mimeType: "application/vnd.ms-powerpoint",
    description: "PowerPoint presentation",
  },
  {
    extension: ".pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    description: "PowerPoint presentation (OOXML)",
  },
  {
    extension: ".odt",
    mimeType: "application/vnd.oasis.opendocument.text",
    description: "OpenDocument text",
  },
  {
    extension: ".ods",
    mimeType: "application/vnd.oasis.opendocument.spreadsheet",
    description: "OpenDocument spreadsheet",
  },
  {
    extension: ".odp",
    mimeType: "application/vnd.oasis.opendocument.presentation",
    description: "OpenDocument presentation",
  },
  { extension: ".txt", mimeType: "text/plain", description: "Plain text" },
  { extension: ".csv", mimeType: "text/csv", description: "CSV spreadsheet" },
  { extension: ".rtf", mimeType: "application/rtf", description: "Rich Text Format" },
  { extension: ".html", mimeType: "text/html", description: "HTML document" },
  { extension: ".xml", mimeType: "application/xml", description: "XML document" },
  { extension: ".json", mimeType: "application/json", description: "JSON document" },
  { extension: ".yaml", mimeType: "application/x-yaml", description: "YAML document" },
  { extension: ".yml", mimeType: "application/x-yaml", description: "YAML document" },
  { extension: ".md", mimeType: "text/markdown", description: "Markdown document" },
]

export const archiveMimeTypes: MimeTypeEntry[] = [
  { extension: ".zip", mimeType: "application/zip", description: "ZIP archive" },
  { extension: ".gz", mimeType: "application/gzip", description: "Gzip archive" },
  { extension: ".tar", mimeType: "application/x-tar", description: "Tar archive" },
  { extension: ".rar", mimeType: "application/vnd.rar", description: "RAR archive" },
  { extension: ".7z", mimeType: "application/x-7z-compressed", description: "7-Zip archive" },
  { extension: ".bz2", mimeType: "application/x-bzip2", description: "Bzip2 archive" },
  { extension: ".xz", mimeType: "application/x-xz", description: "XZ archive" },
  { extension: ".tgz", mimeType: "application/gzip", description: "Gzipped tar archive" },
]

export const codeMimeTypes: MimeTypeEntry[] = [
  { extension: ".js", mimeType: "text/javascript", description: "JavaScript" },
  { extension: ".mjs", mimeType: "text/javascript", description: "JavaScript module" },
  { extension: ".ts", mimeType: "text/typescript", description: "TypeScript" },
  { extension: ".tsx", mimeType: "text/typescript", description: "TypeScript JSX" },
  { extension: ".jsx", mimeType: "text/javascript", description: "JavaScript JSX" },
  { extension: ".css", mimeType: "text/css", description: "CSS stylesheet" },
  { extension: ".scss", mimeType: "text/x-scss", description: "SCSS stylesheet" },
  { extension: ".less", mimeType: "text/x-less", description: "LESS stylesheet" },
  { extension: ".py", mimeType: "text/x-python", description: "Python script" },
  { extension: ".rb", mimeType: "text/x-ruby", description: "Ruby script" },
  { extension: ".php", mimeType: "application/x-httpd-php", description: "PHP script" },
  { extension: ".java", mimeType: "text/x-java", description: "Java source" },
  { extension: ".c", mimeType: "text/x-c", description: "C source" },
  { extension: ".cpp", mimeType: "text/x-c++", description: "C++ source" },
  { extension: ".h", mimeType: "text/x-c", description: "C header" },
  { extension: ".go", mimeType: "text/x-go", description: "Go source" },
  { extension: ".rs", mimeType: "text/x-rust", description: "Rust source" },
  { extension: ".swift", mimeType: "text/x-swift", description: "Swift source" },
  { extension: ".sh", mimeType: "application/x-sh", description: "Shell script" },
  { extension: ".bash", mimeType: "application/x-sh", description: "Bash script" },
  { extension: ".sql", mimeType: "application/sql", description: "SQL script" },
  { extension: ".graphql", mimeType: "application/graphql", description: "GraphQL schema" },
  { extension: ".toml", mimeType: "application/toml", description: "TOML config" },
  { extension: ".ini", mimeType: "text/x-ini", description: "INI config" },
  { extension: ".env", mimeType: "text/x-env", description: "Environment file" },
  { extension: ".dockerfile", mimeType: "text/x-dockerfile", description: "Dockerfile" },
]

export const fontMimeTypes: MimeTypeEntry[] = [
  { extension: ".woff", mimeType: "font/woff", description: "WOFF font" },
  { extension: ".woff2", mimeType: "font/woff2", description: "WOFF2 font" },
  { extension: ".ttf", mimeType: "font/ttf", description: "TrueType font" },
  { extension: ".otf", mimeType: "font/otf", description: "OpenType font" },
  {
    extension: ".eot",
    mimeType: "application/vnd.ms-fontobject",
    description: "Embedded OpenType font",
  },
]

export const allMimeTypes: MimeTypeEntry[] = [
  ...imageMimeTypes,
  ...videoMimeTypes,
  ...audioMimeTypes,
  ...documentMimeTypes,
  ...archiveMimeTypes,
  ...codeMimeTypes,
  ...fontMimeTypes,
]
