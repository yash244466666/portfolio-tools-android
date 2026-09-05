# Android Developer Tools App — Analysis and Implementation Plan

> **Plan baseline:** Reviewed against the repository and current Android/Google Play guidance on September 5, 2026. Re-check time-sensitive platform and Play policy requirements immediately before implementation and before every production release.

## Executive summary

The recommended approach is to create a separate repository using:

- React 19 and TypeScript
- Vite instead of Next.js
- Tailwind CSS 4
- Capacitor 8
- A native Android project maintained under `android/`
- A platform-adapter layer for clipboard, files, sharing, notifications, storage, networking, application lifecycle, and microphone access

This preserves most of the existing tool implementations while giving the Android application proper native permissions, file handling, notifications, back-button behavior, offline support, and Google Play packaging.

The complete portfolio website should not simply be wrapped in a WebView. The tool components and algorithms should be extracted, while the portfolio shell and desktop-oriented tools interface should be replaced by a focused, mobile-first Android application shell.

## 1. Current codebase analysis

### 1.1 Technology stack

The existing project uses:

- Next.js 15.2.4
- React 19
- TypeScript with strict checking
- Tailwind CSS 4
- Static export through Next.js
- Client-side React components for the tools

The tools depend on packages such as CodeMirror, PDF.js, `pdf-lib`, Math.js, DOMPurify, `html-to-image`, and Lucide React.

The Android application should not inherit Next.js. Next.js solves portfolio routing, rendering, and site concerns that are unnecessary in a packaged mobile application. Vite provides a smaller and simpler build pipeline for the reusable React components.

### 1.2 Tool inventory

The catalog defines 87 tools across six categories in `lib/content/tools/index.ts`.

| Category | Number of tools |
|---|---:|
| Core | 7 |
| Developer | 45 |
| Text | 17 |
| Media | 3 |
| Security | 5 |
| Math | 10 |
| **Total** | **87** |

Every catalog definition currently has a corresponding implementation.

The implementations under `components/tools` do not directly import Next.js. Next.js is primarily used by the surrounding page shell in `app/tools/page.tsx`. This makes the tool components substantially more portable than the portfolio application itself.

The current tool loader uses a dynamic import based on category and tool ID in `components/tools/tool-view.tsx`. Vite should use an explicit registry or `import.meta.glob` so all lazy-loaded modules are discoverable at build time.

### 1.3 What can be reused

The following parts can mostly be reused:

- Pure algorithms under `lib/tools`
- Tool metadata and categories
- Individual tool React components
- Shared tool controls such as copy buttons, drop zones, result panels, tabs, and strength meters
- UI primitives that do not depend on the portfolio layout
- Tailwind design tokens after adapting them for Android
- DOMPurify sanitization for Markdown and SVG input
- Canvas-based generators and previews
- Web Crypto-based algorithms, subject to Android WebView testing

### 1.4 What should not be reused directly

The following portfolio-specific behavior should be replaced:

- The pinned horizontal tools filmstrip
- Portfolio backgrounds and decorative animation
- Desktop-first wide layouts
- Hover-dependent interactions
- Portfolio breadcrumbs
- Next.js page/layout infrastructure
- The contact backend and portfolio content
- Website screenshot controls as a global tool action
- Hash-based catalog navigation and custom grid-scroll restoration

The Android application should be a focused tools product, with a small About screen linking back to the portfolio if desired.

## 2. Browser and platform dependency analysis

Several tools use browser APIs that need a native Android abstraction.

| Capability | Current implementation | Android implementation |
|---|---|---|
| Clipboard | `navigator.clipboard` | Capacitor Clipboard adapter |
| Persistent data | `localStorage` | Capacitor Preferences through a repository interface |
| File import | File inputs and drag/drop | Android file chooser or Storage Access Framework |
| File export | Object URLs and hidden download links | Cache file followed by native Share or Save As |
| External websites | `window.open` | Capacitor Browser |
| Notifications | Browser Notification API | Capacitor Local Notifications |
| Microphone | `getUserMedia` and `MediaRecorder` | Native recorder plugin or validated WebView implementation |
| Network state | No common service | Capacitor Network adapter |
| Background timers | React intervals | Persisted deadline plus application lifecycle handling |
| Hardware Back | Browser history | Capacitor App back-button listener |
| Generated files | Browser blobs/downloads | Native cache, filesystem, and share services |

### 2.1 Network requests

Only two implemented utilities make direct API requests:

- Currency Converter calls the Frankfurter exchange-rate API and caches results in `localStorage`.
- DNS Lookup calls Cloudflare DNS-over-HTTPS.

The YouTube Downloader reads from the clipboard and redirects the user to the external Cobalt service.

The current statement that no data ever leaves the browser is therefore inaccurate. Both the website and Android application should use more precise wording, such as:

> Most tools run entirely on your device. Tools marked as requiring internet access send only the information needed for that request to the stated provider.

### 2.2 Persistent storage

The following tools currently use `localStorage`:

- Notes/Scratchpad
- Bookmark Manager
- Currency exchange-rate cache

Favorites, recent tools, settings, dismissed notices, and migration state will also need persistence in the Android app.

Capacitor recommends Preferences instead of relying on WebView `localStorage`, because mobile operating systems can clear local WebView storage. Preferences is suitable for lightweight records but should be hidden behind a versioned repository interface so it can later be replaced by SQLite if the stored data becomes more complex.

### 2.3 Files and generated outputs

Tools that import, generate, or export files include:

- PDF Converter
- Image Compressor
- Base64 Tool
- QR Generator
- Color Palette from Image
- JSON Editor
- iCalendar Generator
- vCard Generator
- Chart Generator
- Bookmark Manager
- Audio Recorder
- Video to GIF
- File Hash Checker
- Tool snapshot export

Browser `<a download>` behavior is not a dependable Android save workflow. The application should write generated data to its cache directory and then offer the Android share sheet. If users need to choose a permanent destination, implement a Storage Access Framework bridge using `ACTION_CREATE_DOCUMENT`.

### 2.4 Timers and application lifecycle

Pomodoro, Stopwatch, and Countdown currently rely mainly on in-memory JavaScript timing. Android can suspend or terminate the WebView when the application moves to the background.

Timer state should therefore store:

- Start timestamp
- Target completion timestamp
- Paused elapsed time
- Current mode
- Notification ID
- State schema version

When the application resumes, it should derive the displayed time from persisted timestamps instead of assuming every interval callback ran.

### 2.5 Large-file and media risks

The highest-risk tools are:

- PDF Converter
- Video to GIF
- Audio Recorder
- File Hash Checker
- Image Compressor
- Color Palette from Image
- JSON Editor on small screens
- Scientific Calculator because of the Math.js bundle size

The current File Hash Checker can read an entire file into memory and advertises support for very large files. This is unsafe on lower-memory Android phones. Version 1 should enforce a much smaller limit or use a native streaming hash implementation.

Video and PDF work should be moved into Web Workers where possible. Memory use, cancellation, progress reporting, and cleanup of object URLs must be explicitly tested.

### 2.6 Additional implementation findings

The deeper source audit found several details that must be corrected or explicitly carried into the migration:

- Audio Recorder is described as producing WAV, but the current implementation records and downloads WebM. The Android product must either advertise the actual format or implement a real WAV/AAC/M4A export path.
- File Hash Checker reads the entire selected file into an `ArrayBuffer`; this is not streaming and must not retain the current large-file promise unchanged.
- Regex Tester evaluates user-provided regular expressions on the UI thread. Catastrophic patterns can freeze the app, so execution limits or a terminable Worker are required.
- PDF conversion repeatedly materializes complete files, page canvases, data URLs, and ZIP content. Page and memory limits are required before it can be enabled publicly.
- Video to GIF encodes frames in JavaScript on the main thread. It requires a Worker or native implementation, strict duration/resolution limits, cancellation, and profiling.
- Morse playback uses Web Audio. It does not require microphone permission, but it still needs WebView audio-focus, interruption, and lifecycle tests.
- HTML entity decoding creates a DOM element. This is compatible with the packaged WebView but should remain isolated and covered by malicious-input tests.
- Several clipboard tools contain deprecated `document.execCommand("copy")` fallbacks. These should be removed in favor of the shared Clipboard service.
- Chart, QR, image, and PDF outputs use Canvas and device-pixel-ratio behavior. Output dimensions must be tested separately from their on-screen CSS size.
- Currency and DNS requests have no shared timeout, cancellation, retry, or connectivity policy today.
- The current repository has no committed test suite covering all tools. Extraction must begin with golden fixtures before component behavior is changed.

### 2.7 Product-safety and accuracy labels

Some utilities need precise descriptions so users do not mistake convenience output for authoritative advice:

- JWT Decoder decodes a token but does not prove its signature is valid unless explicit verification is added.
- ROT13 and Caesar Cipher are obfuscation, not secure encryption.
- Password-strength and crack-time results are estimates, not guarantees.
- Hash generators are not password-storage implementations.
- CSP and CORS generators provide starting configurations that still require deployment-specific review.
- Currency results must display provider, retrieval time, base currency, and stale-cache status; they are informational rather than financial advice.
- Color Blindness Simulator is an approximation and not a medical diagnostic tool.
- Date, age, timestamp, iCalendar, and countdown tools must state their time-zone assumptions.
- Fake generated data must be described as synthetic and not guaranteed to be unique or safe for identity verification.

## 3. Architecture decision

### 3.1 Compared approaches

| Approach | Reuse | Native access | Main disadvantage | Decision |
|---|---:|---:|---|---|
| WebView wrapper around portfolio | Very high | Low | Feels like a website and carries unnecessary portfolio code | Reject |
| Trusted Web Activity/PWA | Very high | Low to medium | Depends heavily on hosted web behavior and has weaker native integration | Reject |
| React Native | Algorithm reuse only | High | Existing React DOM components still need extensive rewriting | Reject |
| Kotlin/Jetpack Compose | Algorithm rewrite required | Excellent | Highest cost and duplicate implementation | Reject for version 1 |
| React, Vite, and Capacitor | High | High through plugins | Requires a carefully designed platform boundary | **Recommended** |

### 3.2 Why Capacitor 8

Capacitor can package a normal modern web application and provide native APIs through plugins. Capacitor 8 supports Android API 24 and newer and targets API 36.

This matches Google Play's current requirement that new applications and updates target Android 16/API 36 beginning August 31, 2026.

Official references:

- [Capacitor documentation](https://capacitorjs.com/docs)
- [Capacitor environment requirements](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Capacitor Android target SDK mapping](https://capacitorjs.com/docs/android/setting-target-sdk)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)

### 3.3 Local environment readiness

The development machine currently has:

- Node.js 24.20
- pnpm 11.24
- Java 21
- An Android SDK directory
- `adb`

Android Studio and installed API 36 platform/build-tools were not discoverable from the command line. They should be installed or verified before generating the production Android project.

### 3.4 Fixed architecture decisions

Use the following decisions unless a proof-of-concept disproves one of them:

- Use a single Android activity containing the Capacitor WebView.
- Use React Router with a hash-based internal route such as `#/tools/json-editor` for deterministic packaged navigation.
- Convert incoming verified website URLs to internal routes through the Capacitor App `appUrlOpen` event.
- Maintain a static, typed lazy-load registry; do not construct import paths from arbitrary user-controlled strings.
- Treat tool input as ephemeral by default. Persist data only for named features such as Notes, Bookmarks, Favorites, Recent, Settings, and timer state.
- Keep all native access behind typed platform contracts.
- Never load remote application HTML or JavaScript into the privileged Capacitor WebView.
- Do not use a live-update or hot-code-push system for executable application code in version 1; ship code changes through Google Play releases.
- Use three build variants: development, internal/QA, and production. Give non-production variants distinct application IDs and labels so they can coexist on one device.

### 3.5 Dependency and platform lifecycle

The application needs an explicit maintenance policy because Android target requirements, WebView behavior, Capacitor, Gradle, and native plugins continue changing after launch.

- Pin Capacitor and native plugin major versions in the lockfile.
- Keep all official Capacitor packages on the same compatible major version.
- Evaluate community plugins for maintenance activity, Android API support, permissions, privacy behavior, license, and 16 KB native-library compatibility before adoption.
- Prefer a small custom Android bridge over an abandoned plugin for critical file or recording behavior.
- Review dependency updates monthly and complete a Capacitor/Android platform review at least quarterly.
- Add a calendar reminder several months before Google Play's annual target-SDK deadline.
- Build and test upgrades from the oldest supported production data schema, not only clean installs.
- Record the exact web source commit used for each extraction so regressions can be traced.

## 4. Proposed separate repository

Suggested repository name:

```text
developer-tools-android
```

Suggested structure:

```text
developer-tools-android/
├── android/
├── public/
│   └── pdf.worker.min.mjs
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── router.tsx
│   │   ├── navigation.ts
│   │   └── providers.tsx
│   ├── catalog/
│   │   ├── categories.ts
│   │   ├── tools.ts
│   │   └── tool-registry.ts
│   ├── features/
│   │   └── tools/
│   │       ├── core/
│   │       ├── dev/
│   │       ├── text/
│   │       ├── media/
│   │       ├── security/
│   │       ├── math/
│   │       └── shared/
│   ├── platform/
│   │   ├── contracts/
│   │   ├── capacitor/
│   │   └── web/
│   ├── storage/
│   │   ├── preferences.ts
│   │   └── migrations.ts
│   ├── workers/
│   ├── ui/
│   └── styles/
├── tests/
├── capacitor.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

The new repository should have one package manager and one lockfile. It should not inherit the current Next.js lint command, ignored build errors, or the portfolio's build/output configuration.

### 4.1 Source provenance and extraction manifest

Create `docs/source-map.md` in the new repository. For every copied module, record:

- Original portfolio path
- Original Git commit
- New application path
- Whether the code is copied, refactored, or replaced
- Responsible tests/fixtures
- Last parity check date

This provides traceability without coupling the repositories through a Git submodule.

### 4.2 Configuration separation

Keep environment differences typed and minimal:

```text
development  -> local browser/device debugging, debug logging
internal     -> Play/internal QA build, production-like restrictions
production   -> release signing, production hosts, no debug bridge/logging
```

No secret may be compiled into the client. Public API endpoints are configuration, not secrets. If a future service needs a private credential, the request must go through a controlled backend rather than embedding the credential in the APK.

## 5. Tool registry design

Use an explicit lazy-loading registry instead of a fully dynamic path:

```ts
type MobileToolDefinition = {
  id: string
  label: string
  category: ToolCategory
  offline: boolean
  requiredAdapters: PlatformCapability[]
  permissions: AndroidPermission[]
  releaseStatus: "enabled" | "experimental" | "disabled"
  load: () => Promise<{ default: React.ComponentType }>
}
```

Each tool should also have migration tracking fields:

- Porting status
- Mobile layout status
- Offline/network classification
- Required permissions
- Required platform services
- Maximum accepted input size
- Unit-test status
- Android-device-test status
- Accessibility status
- Release version

## 6. Tool migration tiers

The following migration groups account for all 87 tools.

### Tier 1: Directly portable — 67 tools

These need mobile layout work and the shared clipboard service, but no major native feature.

| Category | Count |
|---|---:|
| Core | 4 |
| Developer | 36 |
| Text | 14 |
| Security | 5 |
| Math | 8 |
| **Total** | **67** |

Examples include:

- Unit Converter
- Timestamp Converter
- Number Base Converter
- Hash Generator
- Password Generator
- Color Picker
- Markdown Preview
- Regex Tester
- URL Encoder
- JWT Decoder
- SVG Optimizer
- CSV/JSON, YAML/JSON, XML, and SQL utilities
- CSS generators and playgrounds
- HTTP and MIME references
- Unicode and ASCII references
- Word and character utilities
- Password Strength Checker
- Data Sanitizer
- CSP, CORS, and robots.txt generators
- Percentage, date, number, bitwise, and scientific calculators

### Tier 2: Platform adaptation required — 15 tools

- PDF Converter
- Image Compressor
- JSON Editor
- Base64 Tool
- QR Generator
- Color Palette from Image
- iCalendar Generator
- vCard Generator
- Chart Generator
- Pomodoro Timer
- Notes/Scratchpad
- Bookmark Manager
- File Hash Checker
- Stopwatch
- Countdown Timer

Required work includes file import/export, native sharing, persistent storage, notification scheduling, lifecycle recovery, memory limits, and small-screen layout changes.

### Tier 3: Network tools — 2 tools

- Currency Converter
- DNS Lookup

Requirements:

- Explicit internet-required label
- Offline and cached states
- Timeouts and request cancellation
- Provider disclosure
- Clear error handling
- HTTPS-only domain allowlist
- Network behavior documented in the privacy policy and Data Safety answers

### Tier 4: Special product decisions — 3 tools

- Audio Recorder
- Video to GIF
- YouTube Downloader

Recommendations:

- Delay Audio Recorder until native recording and permission behavior are validated.
- Delay Video to GIF until encoding is moved off the UI thread and memory use is controlled.
- Exclude YouTube Downloader from the first Play release. It currently redirects to an external service and introduces policy, reliability, and product-quality questions.

## 7. Mobile application UX

The Android application should feel like a focused utility suite rather than a resized portfolio page.

### 7.1 Navigation

Recommended bottom navigation:

1. Tools
2. Favorites
3. Recent
4. Settings/About

The tools catalog should provide:

- Search visible immediately
- Scrollable category chips
- A vertical list or responsive two-column grid
- Offline and internet-required indicators
- Favorites
- Recently used tools
- Predictable Android hardware-back behavior
- Restoration of the last open screen
- Useful loading, empty, and unavailable states

### 7.2 Tool screens

Each tool screen should use:

- Standard top app bar
- Back, Favorite, and contextual Help actions
- Single-column layout on normal phones
- Multiple columns only on sufficiently wide screens
- Native Share next to Copy where relevant
- Clearly separated destructive Reset/Clear actions
- At least 48dp touch targets
- Safe-area and keyboard handling
- Accessible labels and focus order
- Reduced-motion support
- System light/dark theme support

The existing horizontal pinned interaction, background animations, desktop breadcrumbs, and hover-first controls should not be used.

### 7.3 Visual direction

Recommended style:

- Minimal, technical, and trustworthy
- OLED-friendly dark palette with full light-mode support
- Strong contrast
- Restrained green or cyan accent color
- Eight-pixel spacing system
- Lucide icons rather than emoji
- System typography or locally bundled fonts
- No network-loaded fonts
- Minimal decorative motion

### 7.4 Adaptive layout rules

The app must respond to the current window size, not a guessed device type. Use CSS media/container queries that mirror Android window-size concepts:

- Compact: less than 600dp — bottom navigation, one tool pane, one- or two-column catalog depending on card width
- Medium: 600–839dp — navigation rail where useful, wider catalog, optional list/detail presentation
- Expanded: 840dp and above — navigation rail and list/detail or supporting-pane layout

Do not lock orientation or assume a full-screen phone. Android 16 can ignore orientation and aspect-ratio restrictions on larger displays, so split screen, tablets, foldables, ChromeOS, resizable windows, and desktop windowing must remain usable. [Android adaptive display guidance](https://developer.android.com/develop/adaptive-apps/guides/support-different-display-sizes)

### 7.5 Edge-to-edge and system navigation

Because the app targets API 36, edge-to-edge layout is not optional on recent Android versions. The root shell must consume Window Insets and expose safe-area CSS variables for the status bar, navigation bar, display cutouts, and on-screen keyboard. Fixed top and bottom bars must reserve equivalent content padding so controls are never obscured. [Android edge-to-edge guidance](https://developer.android.com/develop/ui/views/layout/edge-to-edge?hl=en)

Back behavior must be specified by screen state:

1. Close an open dialog, sheet, menu, or keyboard-owned transient layer.
2. If a tool has unsaved destructive changes, show a confirmation or preserve a recoverable draft.
3. Navigate from tool detail to the prior catalog state, restoring search, filters, and scroll position.
4. Navigate between top-level destinations according to the router history.
5. At the root destination, allow the system to leave the app.

Use supported AndroidX/Capacitor back handling and test predictive Back. Do not consume every Back event at the activity level because that prevents correct system animation and exit behavior. [Predictive Back guidance](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture)

### 7.6 Forms, feedback, and accessibility details

- Every input needs a persistent visible label; placeholders are examples, not labels.
- Use `inputmode`, `type`, autocomplete, and enter-key hints to show the correct mobile keyboard.
- Validate after blur or submission rather than displaying errors while the user is still typing.
- Put the error beside the responsible field and state both the cause and recovery action.
- Disable repeated actions while work is running and show progress within 300ms.
- Long jobs need determinate progress where measurable, Cancel, and a result that clearly states where output was saved.
- Copy and Share feedback must be announced through an accessible live region without stealing focus.
- Do not communicate offline, success, warning, or error states through color alone.
- Preserve visible keyboard focus for hardware-keyboard, ChromeOS, and accessibility users.
- Provide non-drag alternatives for any reorder or drag/drop interaction.
- Chart output needs a text summary or data-table alternative; graph segments cannot rely only on color.
- Timer numerals should use tabular figures to avoid layout movement.
- Test contrast independently in light and dark themes.
- Use a first-run privacy explanation of no more than two screens; do not block offline tools behind an account or tutorial.
- Provide per-tool Help that describes inputs, output, offline/network behavior, limits, and safety caveats.
- Use `width=device-width`, `initial-scale=1`, and `viewport-fit=cover`; never disable pinch zoom with `user-scalable=no` or a restrictive maximum scale.
- Use dynamic viewport units and tested keyboard insets instead of assuming `100vh` equals the visible application area.
- Keep the page itself free of horizontal overflow. Put long hashes, code, URLs, tables, and diffs in clearly labeled, independently scrollable/selectable result regions with Copy and Wrap controls.
- Prevent browser pull-to-refresh, overscroll, and text-selection gestures only where they conflict with an explicit control; do not disable selection or standard accessibility gestures globally.
- Preserve unsaved input during an accidental route change within the live session, but do not silently persist secret/private tools across process death.

### 7.7 Tool-session and memory policy

Do not preserve the current website behavior of keeping the entire catalog and active tool tree mounted while hiding one of them.

- Mount only the active tool component and lazy-load its code.
- Keep catalog search/filter/scroll state separately from tool state.
- Provide a small in-memory `ToolSessionStore` only for tools whose input is safe and useful to restore when navigating Back.
- Never place `File`, Blob, Canvas, audio/video stream, object URL, password, token, key, or large parsed document in a global session store.
- Clear secret-classified tool state when the app backgrounds if “Protect sensitive screens” is enabled.
- Abort requests, terminate Workers, stop tracks/audio contexts, release Canvas buffers/object URLs, and remove listeners when a tool unmounts.
- Bound any recent-session cache by item count and estimated bytes, and evict least-recently-used state.
- Restore catalog state after Back without remounting 87 tool components.

## 8. Platform service contracts

Tool components should not import Capacitor plugins directly. They should depend on interfaces:

```ts
interface ClipboardService {
  readText(): Promise<string>
  writeText(
    value: string,
    options?: { sensitive?: boolean; clearAfterMs?: number },
  ): Promise<void>
}

interface FileService {
  pick(options: PickOptions): Promise<PickedFile[]>
  share(data: GeneratedFile): Promise<void>
  saveAs(data: GeneratedFile): Promise<void>
}

interface NotificationService {
  requestPermission(): Promise<boolean>
  schedule(notification: ScheduledNotification): Promise<void>
  cancel(id: string): Promise<void>
}

interface PreferencesService {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

interface RandomService {
  randomBytes(length: number): Uint8Array
  randomUuid(): string
}
```

Provide both `web` and `capacitor` implementations. Browser development can use the web adapters, while installed Android builds use native adapters.

Password, UUID, token, and fake-data tools must use `RandomService`. Cryptographic output must ultimately use `crypto.getRandomValues` or a reviewed native secure-random source, never `Math.random`. This also removes the existing direct dependency on `crypto.randomUUID`, which is unavailable on some older WebView versions even when the application meets the minimum Android API.

Likely official Capacitor plugins:

- App
- Browser
- Clipboard
- Filesystem
- Share
- Preferences
- Local Notifications
- Network
- Haptics
- Keyboard
- Status Bar
- Splash Screen

References:

- [Capacitor Preferences](https://capacitorjs.com/docs/apis/preferences)
- [Capacitor Clipboard](https://capacitorjs.com/docs/apis/clipboard)
- [Capacitor Browser](https://capacitorjs.com/docs/apis/browser)
- [Capacitor Share](https://capacitorjs.com/docs/apis/share)
- [Capacitor Local Notifications](https://capacitorjs.com/docs/apis/local-notifications)
- [Capacitor Filesystem](https://capacitorjs.com/docs/apis/filesystem)
- [Android shared-document access](https://developer.android.com/training/data-storage/shared/documents-files)

### 8.1 File-service contract

The file layer must support Android `content://` URIs without assuming a real filesystem path. It should:

- Validate MIME type using content and system metadata rather than filename extension alone.
- Normalize and sanitize filenames before export.
- Stream file data where possible instead of serializing large files as Base64 across the JavaScript/native bridge.
- Copy an imported URI to a private temporary file only when the web library requires random access.
- Use atomic output writes and report partial failures.
- Revoke temporary URI grants and delete cache output after a defined retention period.
- Share only narrow cache subdirectories through a non-exported Android `FileProvider`, using `content://` URIs and temporary read-only grants; never share `file://` URIs or broad root paths.
- Keep user-created permanent files outside application cache only after an explicit Save action.
- Return typed errors for cancellation, permission denial, unsupported format, size limit, no space, and processing failure.

Initial safety limits, to be adjusted only after device profiling:

| Input | Initial limit |
|---|---:|
| General pasted text | 1 MiB |
| JSON/YAML/XML/CSV | 5 MiB |
| Image | 20 MiB and 25 megapixels |
| PDF | 50 MiB and 200 pages |
| JavaScript file hashing | 50 MiB |
| Native streaming hashing | Based on free space and cancellation support |
| Experimental video | 100 MiB, 30 seconds, maximum 720p output |

Limits must be displayed before selection or processing. A failure must never discard the source file.

### 8.2 Persistence and data-migration contract

- Store a global schema version and migrate data transactionally.
- Keep a pre-migration copy until the new data validates, then remove it.
- Test upgrades from every production schema still in circulation.
- Serialize writes per key, prevent older asynchronous writes from overwriting newer state, and flush debounced Notes/timer changes when the app pauses.
- Never persist passwords, JWTs, private text, pasted files, hash inputs, or generated secrets automatically.
- Persist timer state only when a timer is active.
- Provide Export, Import, and Clear All for Notes, Bookmarks, Favorites, and Settings.
- Use a documented JSON export schema with version, created-at timestamp, and validation on import.
- Resolve import conflicts explicitly: replace, merge, or cancel.
- Treat caches as disposable and exclude them from backup/export.
- Before exporting Notes/Bookmarks, warn that the JSON file is not encrypted and that the selected share/save destination controls its future privacy.
- Show the exact item counts and data classes included before import, export, merge, replace, or Clear All.
- Make Clear All recoverable through a short in-app undo only when a private temporary copy can be kept safely; otherwise require explicit confirmation and state that deletion is permanent.

### 8.3 Network-client contract

All network tools must use one service with:

- HTTPS-only endpoint allowlisting
- Connection and overall timeouts
- `AbortController` cancellation when the screen closes or the user retries
- Bounded retry with backoff only for safe transient failures
- Connectivity-aware messages without treating connectivity state as proof the internet works
- Response status, content-type, schema, and size validation
- Cache version, fetched-at time, expiry time, and stale-while-offline behavior
- No API secrets in the application bundle
- Provider attribution and a link to provider terms/privacy information
- A tested provider-removal/fallback path if an endpoint changes terms or becomes unavailable

Currency should show the rate timestamp and permit stale cached data only with a visible stale label. DNS results should distinguish no-record responses from transport/API failures.

### 8.4 Routing and verified App Links

Internal navigation and public sharing are separate concerns:

- Internal screen: `#/tools/<tool-id>`
- Public share URL: `https://<owned-domain>/tools/<tool-id>`
- Installed behavior: verified App Link opens the matching internal tool
- Not-installed behavior: the same URL opens the existing website tool

If public tool links are enabled, publish `https://<owned-domain>/.well-known/assetlinks.json` using the Play App Signing certificate fingerprint, configure `android:autoVerify="true"`, validate all incoming tool IDs against the registry, and test verification with ADB. [Android App Links guidance](https://developer.android.com/training/app-links/about)

The existing website currently identifies tools with URL fragments such as `/tools#<tool-id>`, while the proposed App Link uses `/tools/<tool-id>`. Fragments are not a suitable canonical cross-platform routing contract. Before enabling App Links, update the website to support a real path or query-based canonical URL, preserve old fragment links with a compatibility redirect, add canonical metadata, and test installed and not-installed behavior. If the website is not changed for version 1, omit public App Links and share the existing website URL without claiming direct-to-tool routing.

### 8.5 Android WebView compatibility baseline

Minimum Android API and actual WebView feature support are different constraints. Define and test a WebView baseline before selecting JavaScript/CSS output targets.

- Set explicit Vite/esbuild and Browserslist targets compatible with the supported Android System WebView baseline.
- Audit `crypto.randomUUID`, Web Crypto algorithms, `Intl`, Canvas, MediaRecorder, Web Audio, CSS `oklch()`, backdrop filters, container queries, and other modern APIs.
- Provide reviewed fallbacks for required functionality or raise the effective minimum supported WebView with a clear unsupported-system message.
- Include sRGB fallbacks before modern color functions so old WebViews never render invisible text/surfaces.
- Test IME composition, Gboard suggestions, paste, selection, and CodeMirror editing on physical Android devices.
- Test with an updated WebView and the oldest supported test image; do not assume the developer device represents all users.
- Log only WebView/app version metadata in a user-triggered diagnostic report, never tool contents.

Capacitor documents its supported Android and WebView baseline separately from the Android API level. [Capacitor Android support](https://capacitorjs.com/docs/android)

### 8.6 Native/custom plugin acceptance criteria

Any custom or community Android plugin must:

- Expose a narrow typed API, never arbitrary paths, arbitrary URLs, arbitrary intents, or command execution.
- Validate every JavaScript argument again on the native side.
- Use `content://` URIs and scoped temporary grants for files.
- Perform disk, hashing, media, and encoding work off the Android main thread.
- Support cancellation and settle every plugin call exactly once.
- Handle concurrent calls deliberately instead of overwriting a single callback.
- Remove listeners and close descriptors/streams during activity destruction.
- Return stable machine-readable error codes plus safe user messages.
- Version its bridge contract and include upgrade compatibility tests.
- Document every manifest component, permission, FileProvider path, Gradle dependency, ProGuard/R8 rule, and native library.
- Pass Android Lint, unit/instrumented tests, process-recreation tests, and 16 KB compatibility checks.

Version 1 should not register broad `ACTION_SEND`, arbitrary file `VIEW`, or share-target intent filters. Imports should begin inside the app through system pickers. The only exported entry points should be the launcher activity and narrowly matched verified App Links. Revisit inbound share/open-with support as a separate feature with its own threat model.

## 9. Android permissions

Version 1 should request as few permissions as possible.

Expected permissions:

- `INTERNET` for Currency Converter and DNS Lookup
- `POST_NOTIFICATIONS` only when the user enables timer notifications
- `RECORD_AUDIO` only when Audio Recorder is released

Version 1 should **not** request `USE_EXACT_ALARM`. Google Play restricts that permission to applications whose core purpose genuinely requires precise alarms. Pomodoro and Countdown should initially use best-effort local notifications, persist their target timestamp, and correct the visible state when the app resumes. If product testing proves exact alarms are essential, conduct a separate policy review before adding `SCHEDULE_EXACT_ALARM` and its user-facing special-access flow. [Android alarm guidance](https://developer.android.com/develop/background-work/services/alarms), [Google Play exact-alarm policy](https://support.google.com/googleplay/android-developer/answer/16558241)

On Android 13 and newer, request `POST_NOTIFICATIONS` contextually when the user enables timer alerts, not on first launch. If denied, the timer must remain usable in the foreground and explain how to enable notifications later. [Android notification permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)

Audio recording should be foreground-only in its first release. Stop and finalize safely when the app backgrounds unless a separately designed foreground-service implementation is added. Android 14 and newer apply microphone foreground-service restrictions, so background recording must not be inferred from ordinary microphone permission. [Android foreground-service types](https://developer.android.com/about/versions/14/changes/fgs-types-required)

Avoid requesting:

- Broad storage access
- Contacts access
- Camera access unless a future feature requires it
- Location
- Background microphone access

Files should be selected through system pickers. A generated vCard does not require contacts permission because the application creates a file rather than accessing the user's address book.

Do not request `READ_MEDIA_IMAGES` or `READ_MEDIA_VIDEO` for occasional conversion/import. Use the Android Photo Picker or another system picker so users grant only the selected item. [Google Play Photo and Video Permissions policy](https://support.google.com/googleplay/android-developer/answer/14115180?hl=en-CA)

Every production build must include an automated manifest-permission diff. The build should fail when a dependency adds an undeclared or unreviewed dangerous, special, or package-visibility permission.

Maintain a release denylist that fails CI if the merged manifest unexpectedly contains permissions such as `MANAGE_EXTERNAL_STORAGE`, legacy external-storage permissions, `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, `READ_CONTACTS`, `QUERY_ALL_PACKAGES`, `AD_ID`, `USE_EXACT_ALARM`, location, camera, phone, SMS, accessibility-service, VPN, or background microphone permissions. A future feature can change the denylist only through a recorded policy/privacy review.

## 10. Security and privacy design

### 10.1 Recommended version 1 policy

- Free application
- No advertising
- No analytics
- No crash-reporting SDK that uploads user data
- No user account
- No cloud synchronization
- No background tracking

This is the simplest privacy posture and matches the local-first product promise.

### 10.2 WebView controls

- Load only bundled application content in the WebView.
- Open external links with the native Browser plugin.
- Do not enable broad WebView file access.
- Permit only HTTPS network calls.
- Allowlist the Frankfurter and Cloudflare endpoints.
- Validate all URLs before opening them.
- Do not expose native bridges to untrusted web content.
- Maintain a restrictive Content Security Policy.
- Continue sanitizing Markdown and SVG input.
- Set a Network Security Configuration that rejects cleartext traffic for all remote hosts.
- Disable WebView debugging in production.
- Disable mixed content and unnecessary file/content access.
- Intercept all link navigation and route non-owned HTTPS URLs through the native Browser.
- Validate imported bookmark URLs and allow only explicitly supported schemes, normally `https` and optionally `http`; reject `javascript:`, `data:`, `file:`, and intent URLs.
- Do not add JavaScript interfaces to any WebView that can display untrusted content.
- Enable R8/resource shrinking for release builds only after plugin keep rules are verified; archive the mapping file and native debug symbols needed for Play crash deobfuscation.

Android security references:

- [WebView native bridge security](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- [WebView file-access security](https://developer.android.com/privacy-and-security/risks/webview-unsafe-file-inclusion)
- [Android Network Security Configuration](https://developer.android.com/privacy-and-security/security-config)

### 10.3 Privacy wording

The privacy policy and in-app privacy screen should explain:

- Most processing occurs locally on the device.
- Notes, bookmarks, favorites, and settings remain on the device.
- Currency requests send currency codes to Frankfurter.
- DNS requests send the queried domain and record type to Cloudflare.
- Network providers also receive ordinary connection metadata such as the user's IP address, request time, TLS connection details, and WebView/native HTTP user agent, and may retain it under their own policies.
- Clipboard content is read only after a direct user action.
- Microphone access is requested only while using Audio Recorder.
- Generated files remain local unless the user shares them.
- Uninstalling the application removes application-private data.

### 10.4 Backup and device-transfer policy

Android Auto Backup includes SharedPreferences and internal files by default and can upload them to the user's Google Drive. That conflicts with an unconditional claim that Notes and Bookmarks never leave the device. [Android Auto Backup](https://developer.android.com/identity/data/autobackup?hl=en)

Version 1 should therefore make an explicit choice and test the final manifest:

- Exclude Notes, Bookmarks, imported content, generated secrets, temporary files, and caches from cloud backup and device-to-device transfer rules.
- Either exclude Favorites and Settings as well for a strict local-only promise, or disclose that Android may back them up. The strict local-only option is recommended.
- Provide manual JSON Export/Import so users control movement between devices.
- Validate `android:dataExtractionRules` for Android 12+ and the legacy backup rules used by older supported Android versions.
- Check the merged release manifest because plugin manifests can change backup attributes.

The privacy policy, Data Safety answers, in-app privacy copy, manifest backup rules, and actual runtime behavior must say the same thing.

### 10.5 Threat model and unsafe-input controls

| Threat | Required control |
|---|---|
| Malicious bookmark or Markdown link | Scheme allowlist and external Browser routing |
| Hostile SVG/HTML | DOMPurify policy, no script/event attributes, CSP |
| Catastrophic regular expression | Worker execution, time budget, terminate action, input limit |
| Oversized JSON/XML/YAML/PDF/media | Preflight limits, bounded parsing, cancellation, memory checks |
| Formula injection in exported CSV | Escape or warn on cells beginning with formula characters |
| Path traversal or unsafe filename | Generated safe filename; never trust imported name as a path |
| Native bridge abuse | Bundled content only, narrow typed plugin surface, URL validation |
| Sensitive data in logs | Redaction by default; never log tool inputs or generated secrets |
| Compromised dependency/plugin | Lockfile, review, vulnerability scan, SBOM, rapid update process |
| Stale or poisoned network cache | Schema validation, strict provider host allowlist, expiry metadata |

### 10.6 Third-party code and legal inventory

Before the first beta:

- Inventory every JavaScript, Android, Capacitor, and transitive dependency.
- Record license, version, source, permissions, native libraries, and network behavior.
- Generate an in-app Open Source Licenses/Notices screen and a distributable `THIRD_PARTY_NOTICES.md`.
- Verify licenses and attribution requirements for Unicode, emoji, MIME, HTTP status, fake-data, and other bundled datasets.
- Review Frankfurter, Cloudflare DNS, Cobalt, and any future API terms, privacy terms, attribution, rate limits, and acceptable use.
- Review app name, icon, screenshots, and description for trademark conflicts.
- Generate an SBOM for every release artifact.

Google Play makes the app developer responsible for data and policy behavior introduced by third-party SDKs. [Google Play SDK requirements](https://support.google.com/googleplay/android-developer/answer/13323374?hl=en)

## 11. Detailed implementation phases

### Phase 0 — Product and repository decisions

Estimated duration: 1–2 days.

Decide:

- Final app name
- Immutable Android application ID, for example `dev.yash.tools`
- Repository name
- Free, paid, advertising, or donation model
- Analytics and crash-reporting policy
- Play Console account type and creation date
- Public privacy-policy URL
- Minimum Android version
- Versioning convention
- Product category and primary audience
- Version 1 tool scope and explicit out-of-scope list
- Whether public tool App Links are required in version 1
- Strict local-only backup policy versus disclosed Android backup
- User support email and website
- App-name, package-name, domain, and trademark availability
- Third-party API terms and fallback decisions

Recommended defaults:

- Minimum SDK: API 24
- Target SDK: API 36
- Free
- No ads
- No analytics for version 1
- No sign-in
- Strict local-only data rules with user-controlled export/import
- No exact-alarm permission
- No remote executable-code update system

Deliverables:

- One-page product requirements document
- Version 1 tool manifest
- Data inventory and preliminary Data Safety worksheet
- Permission budget
- Threat-model draft
- Decision log with owner and decision date
- Store-listing claims matrix tied to implemented evidence

### Phase 1 — Scaffold the separate repository

Estimated duration: 2–3 days.

Tasks:

- Create a Vite React TypeScript project.
- Add Tailwind CSS 4.
- Configure the `@/` TypeScript and Vite alias.
- Configure explicit JavaScript, CSS, and Browserslist/WebView targets plus modern-color fallbacks.
- Install and initialize Capacitor 8.
- Set the Capacitor web directory to `dist`.
- Freeze and document the production local scheme/hostname/origin.
- Ensure no PWA service worker is registered in packaged builds.
- Generate the Android project.
- Install or verify Android Studio, API 36, and current build-tools.
- Create development, internal, and production build variants.
- Configure edge-to-edge layout and safe-area propagation from the first screen.
- Configure predictive Back-compatible navigation.
- Add the release Network Security Configuration and disable cleartext remote traffic.
- Add explicit backup/data-extraction rules.
- Add adaptive, monochrome, and legacy launcher icons plus splash-screen resources.
- Add ESLint and formatting.
- Add Vitest and React Testing Library.
- Add Playwright for browser-harness testing.
- Add CI for lint, type-check, unit tests, web build, and Android debug build.
- Launch the application on a physical Android device.
- Run an early production-origin CORS spike against Frankfurter and Cloudflare.
- Package and load one real module Worker and the PDF.js Worker under the release CSP.

Acceptance criteria:

- Debug APK builds successfully.
- The application opens on a physical phone.
- It works without an internet connection.
- Rotation does not break navigation.
- Hardware Back behaves correctly.
- Release web assets do not depend on a development server.
- Development and production variants can be installed side by side.
- The merged release manifest contains only approved permissions, hosts, backup settings, and exported components.
- Content is not obscured by status/navigation bars in gesture or three-button navigation modes.
- The production origin is a secure context and does not use `file://`, arbitrary remote HTML, or development-server fallbacks.
- Provider requests either pass from the packaged production origin or use the approved narrow native HTTP adapter.
- A Play-style application upgrade loads only the new bundled code without stale service-worker assets or loss of user data.

### Phase 2 — Extract reusable foundations

Estimated duration: 3–5 days.

Copy code in this order:

1. Pure algorithms from `lib/tools`.
2. Tool catalog and types.
3. Shared tool components.
4. Required UI primitives.
5. A small representative set of individual tools.
6. Golden input/output fixtures captured before behavior-changing refactors.

Do not copy:

- Portfolio sections
- Contact infrastructure
- Next.js layouts and routes
- Animated portfolio backgrounds
- Existing Next.js build configuration
- Both existing lockfiles
- Build settings that ignore TypeScript or lint failures

Introduce platform-service interfaces before copying every tool. Direct native or browser API calls should be refactored during extraction, not after the complete catalog has moved.

Acceptance criteria:

- Shared tool primitives render correctly on mobile.
- Existing algorithm fixtures produce identical results.
- No extracted tool imports Next.js.
- The application has a deterministic lazy tool registry.
- `docs/source-map.md` records the originating path and Git commit.
- Third-party datasets and copied assets have known license/attribution status.

### Phase 3 — Build the Android application shell

Estimated duration: 4–6 days.

Implement:

- Tools catalog
- Search
- Categories
- Favorites
- Recent tools
- Settings/About
- Tool routes
- Lazy loading
- Loading and error boundaries
- Android back-button integration
- Deep-link mapping
- Verified App Links when included in version 1 scope
- Offline/network labels
- Theme handling
- Scroll-position restoration where appropriate
- Compact, medium, and expanded adaptive layouts
- Predictive Back and unsaved-work behavior
- Search aliases, tags, recent queries, and zero-result recovery

Acceptance criteria:

- Every enabled tool is discoverable within two or three interactions.
- Back navigation matches Android expectations.
- Favorites and recent items survive application restart.
- Catalog navigation does not use the portfolio's pinned horizontal interface.
- Compact, split-screen, tablet, foldable, and landscape layouts stay usable.
- TalkBack focus moves to the tool heading after route changes.
- Bottom navigation and app bars remain clear of all system insets.

### Phase 4 — Implement platform adapters

Estimated duration: 4–7 days.

Implement:

- Clipboard
- Preferences and schema migrations
- File picking
- Cache-file generation
- Native sharing
- Save As flow if required
- External browser
- Network status
- Local notifications
- Application lifecycle
- Status bar
- Keyboard behavior
- Safe areas
- Optional haptics
- Typed platform error model
- Android URI grant and `content://` handling
- Cache retention and cleanup
- Backup/export/import policy
- Foreground-only recording lifecycle

Add a lint restriction that prevents direct use of native-sensitive browser APIs outside `src/platform` and approved low-level utilities.

Acceptance criteria:

- No tool directly uses `localStorage`.
- No tool creates a hidden anchor to download a generated file.
- External URLs never load inside the privileged app WebView.
- Notification permission is requested only after a user action.
- Timer behavior is defined when notification permission is denied.
- No exact-alarm permission is present.
- Large files do not cross the native bridge as Base64.
- Cache output is removed after the documented retention period.

### Phase 5 — Port tools by risk

Estimated duration: 2–4 weeks.

Recommended order:

1. Ten to fifteen representative Tier 1 tools.
2. Remaining Tier 1 tools by category.
3. Notes, Bookmarks, Pomodoro, QR Generator, and JSON Editor.
4. iCalendar, vCard, chart, and image exports.
5. PDF and image processing.
6. File hashing with strict limits or native streaming.
7. Currency Converter and DNS Lookup.
8. Audio Recorder and Video to GIF experiments.

During this phase, fix product accuracy issues rather than copying labels blindly. In particular, reconcile the Audio Recorder's advertised and actual output format, label JWT as decode-only unless verification is implemented, show currency freshness, and publish per-tool limits/caveats.

Every tool requires:

- Input/output parity tests
- Narrow-phone UI verification
- Light/dark theme verification
- Offline/network classification
- Copy/share verification
- Rotation and process-resume checks
- Accessibility labels
- Large-input behavior
- Error state
- Reset state
- Cancellation where work can take more than a moment

### Phase 6 — Security and reliability hardening

Estimated duration: 1–2 weeks.

Tasks:

- Apply WebView host restrictions.
- Add Content Security Policy rules.
- Verify HTTPS-only network access.
- Validate external URLs.
- Test malicious Markdown, SVG, JSON, XML, CSV, and URL input.
- Verify permission-denied behavior.
- Add dependency and secret scanning.
- Test application process destruction and restoration.
- Verify no sensitive tool input is logged.
- Audit Data Safety answers against the actual application behavior.
- Complete the dependency/license inventory and generate notices/SBOM.
- Fuzz or property-test parsers, converters, sanitizer boundaries, and URL handling.
- Test regex and Math.js denial-of-service inputs with execution budgets.
- Verify Android backup behavior on real backup/restore and device-transfer flows.

Acceptance criteria:

- No untrusted page receives access to native bridges.
- Denied permissions produce usable error states.
- Offline tools make no network requests.
- Network tools disclose the provider and sent fields.
- Release builds disable WebView debugging and reject cleartext remote requests.
- Bookmark, Markdown, and generated links cannot open unsafe URL schemes.
- Logs contain no pasted text, file content, passwords, JWTs, or generated secrets.

### Phase 7 — Performance and device QA

Estimated duration: 1–2 weeks.

Test at minimum:

- Android 7/API 24
- Android 10
- Android 13 notification permission behavior
- Android 15
- Android 16/API 36
- Low-memory emulator/device
- Physical mid-range Android phone
- Small tablet
- Large tablet
- Portrait and landscape
- TalkBack
- 200% system font size
- Airplane mode
- Fresh install
- Upgrade from previous version
- Process recreation
- 16 KB memory-page configuration
- Gesture and three-button navigation modes
- Predictive Back preview/cancel/complete behavior
- Edge-to-edge with display cutouts
- Split screen and resizable windows
- Foldable posture changes when hardware is available
- Hardware keyboard, mouse/trackpad, and switch-access navigation
- Multiple Android System WebView versions still in supported use
- Low storage and no-storage-left conditions
- Clock, time-zone, locale, 12/24-hour, and daylight-saving changes
- Notification permission denied and revoked after scheduling
- Android Auto Backup/device-transfer behavior

Performance work:

- Lazy-load CodeMirror, PDF.js, Math.js, GIF encoding, and media code.
- Move CPU-heavy conversions into Web Workers.
- Avoid loading all tool chunks at startup.
- Enforce safe file-size limits.
- Cancel processing when users leave a screen.
- Release object URLs and media streams.
- Measure cold start, input latency, memory use, and unresponsive frames.
- Use `bundletool` and Play Console estimates to measure per-device compressed download size.
- Inspect native libraries for 16 KB compatibility rather than assuming plugin compatibility.
- Install and test the artifact delivered by the Play internal track, not only the Android Studio build.

Android reference:

- [16 KB page-size support](https://developer.android.com/guide/practices/page-sizes)

### Phase 8 — Google Play preparation

Estimated duration: 3–5 days plus the required testing-track period.

Tasks:

- Create the application in Play Console early.
- Reserve the final package/application ID.
- Generate an upload key outside the repository.
- Enable Play App Signing.
- Produce a signed Android App Bundle.
- Create the application icon.
- Create phone and tablet screenshots.
- Create a 1024 × 500 feature graphic.
- Write the short and full store descriptions.
- Build store screenshots from synthetic fixtures only; never expose real notes, bookmarks, domains, tokens, filenames, contacts, calendars, or recordings.
- Host a public privacy policy.
- Complete Data Safety.
- Complete content rating.
- Complete target-audience declarations.
- Complete advertising declarations.
- Complete the Financial Features declaration even if the final answer is that the app has no regulated financial feature; review whether the informational Currency Converter changes that answer.
- Complete app-access instructions and state that no login is required.
- Complete the US export-law declaration and review the app's cryptographic/hash functionality with appropriate legal guidance.
- Select launch countries/regions and confirm both network providers work under their terms in those locations.
- Complete permissions declarations and verify the exact-alarm permission is absent.
- Add support email, support URL, privacy URL, and open-source notices.
- Complete Android developer identity/package registration where required.
- Publish and verify `assetlinks.json` when App Links are enabled.
- Verify store claims against the release tool manifest; do not advertise disabled/experimental tools.
- Add release notes, known limitations, rollback owner, and rollout stop criteria.
- Upload an internal-testing release.
- Run the Play pre-launch report.
- Conduct closed testing.
- Resolve crashes and Android vitals issues.
- For the first production publication, use internal/closed testing, managed publishing, deliberate country availability, and a staffed launch window; Play does not offer a percentage-based staged rollout for an application's first production release.
- For later production updates, use percentage-based staged rollouts with observation windows and explicit halt criteria.
- Preserve the upload key and recovery instructions in secure, independently backed-up storage.

Official references:

- [Android App Bundle and signing](https://developer.android.com/studio/publish/upload-bundle?hl=en)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)
- [Google Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en-GB)
- [Google Play store-listing assets](https://support.google.com/googleplay/android-developer/answer/9866151?hl=en)
- [Google Play content rating](https://support.google.com/googleplay/android-developer/answer/9859655?hl=en_EN)
- [Google Play target audience](https://support.google.com/googleplay/android-developer/answer/9867159?hl=en-GB)
- [Android developer verification guide](https://developer.android.com/developer-verification/guides/pdf-guides/pdc-guide.pdf)
- [Android App Bundle size guidance](https://developer.android.com/guide/app-bundle/faq)
- [Google Play Financial Features declaration](https://support.google.com/googleplay/android-developer/answer/13849271?hl=en)
- [Google Play package-name registration](https://support.google.com/googleplay/android-developer/answer/16984799?hl=en)

If the Play Console personal account was created after November 13, 2023, current production-access rules require a closed test with at least 12 testers continuously opted in for 14 days.

All Play apps must complete the Financial Features declaration, including apps that declare no financial features. Also verify developer identity and package registration: current Play guidance makes package registration effective September 30, 2026, although eligible new Play apps may be registered automatically.

### Phase 9 — Post-launch operation

This is ongoing work, not an optional future phase.

- Treat the first production launch separately from updates: monitor the staffed first-launch window closely because percentage-based staged rollout is unavailable for an application's initial publication.
- For every later update, start with a small staged rollout and define who can halt it.
- Review crashes, ANRs, excessive wakeups, permission denials, reviews, and device-specific issues daily during rollout.
- Use Play Android Vitals and an explicit user-triggered diagnostic export instead of silently adding analytics.
- Keep a tested rollback release and written rollback steps.
- Triage support reports without asking users to send sensitive tool inputs.
- Publish a support and security-reporting contact.
- Reconcile the Data Safety form after every SDK, permission, endpoint, backup, or telemetry change.
- Review API-provider availability and terms quarterly.
- Run monthly dependency updates and quarterly platform/API-36 regression builds.
- Remove or remotely describe a broken network tool through store/support communication; do not download replacement executable code outside Play releases.

The diagnostic export should contain only app version, version code, Android version, WebView version, device model/class, enabled tool ID, permission states, and redacted error codes/timestamps. Show a preview before sharing and exclude clipboard content, user input, filenames, URLs/domains, notes, bookmarks, file contents, generated secrets, and recording data.

## 12. Testing strategy

### 12.1 Unit tests

Add deterministic tests for:

- Converters
- Encoders and decoders
- Hashes and HMAC
- Text transformations
- Date and time calculations
- Cron expressions
- Color conversions and contrast
- CSV, JSON, YAML, XML, and SQL behavior
- Mathematical calculations
- Password generation constraints
- Validation and sanitization
- Locale-aware number/date formatting
- Time-zone and daylight-saving transitions
- Import/export schema migrations
- URL scheme and hostname validation
- Cache expiry and stale-data decisions
- File-size and page-count limit calculations
- Timer recovery from persisted timestamps

Where possible, run the same fixtures against the website implementation and the extracted package during migration.

Use property-based or fuzz tests for parsers, encoders, formatters, regular-expression boundaries, URL handling, and import schemas. Each failing fuzz input should become a permanent regression fixture.

### 12.2 Component tests

Cover:

- Input validation
- Disabled and loading states
- Copy/share actions
- Reset behavior
- Permission denial
- Network failures
- Offline state
- Storage migration
- File-size rejection
- Error boundaries
- Cancellation and double-tap prevention
- Accessible progress/status announcements
- Unsaved-work navigation behavior
- Large-text and keyboard-overlap behavior
- Adapter failure mapping

### 12.3 Android integration tests

Cover:

- Cold launch
- Hardware Back
- Deep-link opening
- File selection
- Sharing generated output
- Notification permission and scheduling
- External browser launch
- Background/resume timer behavior
- Rotation
- Process death/restoration
- Theme changes
- Keyboard overlap
- Predictive Back cancellation and completion
- Edge-to-edge insets in gesture and three-button modes
- Verified App Links and invalid incoming tool IDs
- Backup exclusion and migration restore
- Content URI import without filesystem-path assumptions
- Low-storage export failure and cache cleanup
- Notification revocation after a timer is scheduled
- Production WebView restrictions and external-link interception

### 12.4 Manual release checklist per tool

Every enabled tool must be tested for:

- Correct result
- Mobile layout
- Smallest supported screen
- Landscape mode
- Large fonts
- Dark and light themes
- Empty input
- Invalid input
- Very large input
- Copy
- Share/export
- Back navigation
- Offline behavior
- Accessibility label and focus order
- Correct mobile input keyboard
- Pressed, disabled, loading, success, and error feedback
- Safety caveat and file/input limits
- Locale, time-zone, and 12/24-hour behavior where relevant
- Screen-reader alternative for visual-only output

### 12.5 Adapter contract tests

Run the same behavioral contract against browser and Capacitor implementations:

- Clipboard success, unavailable, and denied
- Preference read/write/remove, corruption, and migration
- File pick cancellation, URI-only input, bad MIME, oversized input, and no space
- Share unavailable/cancelled/successful
- Browser URL rejection and successful external opening
- Notification allowed, denied, revoked, scheduled, and cancelled
- Network online, offline, timeout, invalid response, stale cache, and cancellation
- App pause, resume, cold recreation, and deep-link opening

### 12.6 Release-artifact tests

Testing source code is insufficient. For every release candidate:

1. Build the signed AAB in CI.
2. Inspect the merged manifest and permission diff.
3. Generate device APKs with `bundletool`.
4. Install those generated APKs on the device matrix.
5. Upload the same AAB to Play internal testing.
6. Install it from Play and repeat smoke, App Link, notification, file, and upgrade tests.
7. Record artifact hash, version code, signing certificate, SBOM, and test result.

## 13. CI/CD plan

Every pull request should run:

1. Dependency installation with a frozen lockfile
2. TypeScript type-check
3. ESLint
4. Unit tests
5. Component tests
6. Production Vite build
7. Android debug build
8. Dependency vulnerability scan
9. Secret scan
10. License and third-party notice validation
11. SBOM generation
12. Web bundle and per-tool chunk-size budgets
13. Android Lint and merged-manifest policy checks
14. Instrumented emulator smoke tests
15. 16 KB native-library compatibility check
16. Backup-rule and Network Security Configuration validation
17. Release minification/resource-shrinking check plus mapping/native-symbol archival

Reproducibility and supply-chain rules:

- Pin Node and pnpm through repository metadata/tool-version files.
- Commit the Gradle wrapper and pin the Java toolchain, compile/target SDK, build-tools, Android Gradle Plugin, Kotlin, Capacitor, and plugin versions.
- Use frozen dependency resolution in CI and review every dependency install/build script; do not copy the portfolio repository's placeholder pnpm build approvals.
- Enable dependency-review checks for new direct/transitive packages and verify package integrity through the lockfile.
- Build release candidates only from protected tags/commits after all required reviews.
- Record source commit, lockfile hash, Gradle dependency report, AAB hash, SBOM, and CI workflow revision with the release.
- Periodically rebuild the same tagged source and investigate unexplained artifact/dependency changes.

Release workflow:

1. Update `versionName` and `versionCode`.
2. Run the full test suite.
3. Generate the production web bundle.
4. Run `cap sync android`.
5. Build the signed Android App Bundle.
6. Upload to the internal track.
7. Verify the Play pre-launch report.
8. Promote to closed testing.
9. For the first public release, publish during the approved managed-publishing launch window; for later updates, promote through the approved staged rollout.

Production promotion must be a protected/manual CI environment. It must verify that the Git tag, AAB hash, version code, changelog, SBOM, signing configuration, Data Safety review, and approved tool manifest refer to the same candidate.

Signing keys, Play service-account credentials, and other secrets must remain outside the repository and be stored in the CI secret manager.

The upload key needs a documented recovery process and an offline backup controlled separately from CI. Do not expose signing secrets to pull-request builds or untrusted forks.

## 14. Release strategy

### Internal alpha

Include 10–15 representative tools that prove:

- Pure calculations
- Clipboard
- Canvas output
- CodeMirror
- Persistent storage
- Native file sharing
- Notifications
- One network request

### Closed beta

Include:

- All stable Tier 1 tools
- Notes and Bookmarks
- Pomodoro
- QR Generator
- JSON Editor
- Stable export tools

### Public version 1

Target approximately 70 or more thoroughly tested tools. A smaller stable catalog is preferable to claiming all 87 while several crash, lose files, or work poorly on phones.

The exact count is a target, not a launch requirement. Only tools marked `enabled` in the signed release manifest and passing their Definition of Done may be mentioned in the Play listing. Experimental tools should remain in internal builds rather than appear as visibly broken production entries.

### Version 1.1

Add or improve:

- PDF workflows
- Image processing
- Large-file hashing
- Currency Converter
- DNS Lookup

### Version 1.2

Consider:

- Audio Recorder
- Video to GIF

Keep YouTube Downloader excluded until it receives a separate Play policy, legal, reliability, and product-value review.

## 15. Main risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Browser downloads fail or confuse users | Lost/generated files are inaccessible | Native cache plus Share/Save services |
| Background timers drift | Incorrect alarms and elapsed times | Persist absolute timestamps and schedule notifications |
| Large files exhaust memory | Crashes and Play quality problems | Strict limits, streaming, workers, cancellation |
| Dynamic tool imports are missed by Vite | Tool screen fails at runtime | Explicit registry or `import.meta.glob` |
| Heavy dependencies increase startup time | Poor reviews and Android vitals | Lazy chunks and bundle budgets |
| WebView opens untrusted content | Native bridge/security exposure | Packaged content only and native external browser |
| Privacy promise is inaccurate | User trust and Play disclosure risk | Accurate per-tool network labels and privacy policy |
| Separate repositories drift | Fixes applied to only one product | Extract framework-independent logic into a versioned package later |
| Too many tools are ported before architecture is proven | Large rework | Build a representative vertical slice first |
| Play testing requirements delay launch | Release date slips | Create Play entry and recruit testers early |
| Android Auto Backup contradicts local-only claims | Undisclosed data can leave the device | Explicit data-extraction rules and manual user-controlled export/import |
| Exact-alarm permission is rejected by Play | Release blocked | Do not request it in version 1; use best-effort notifications |
| Edge-to-edge obscures controls | App is unusable on recent Android | Insets from the first prototype; gesture and three-button tests |
| Predictive Back conflicts with the web router | Unexpected exit or trapped navigation | Documented state machine and system-compatible callbacks |
| Regex/parser inputs freeze the main thread | ANR and data loss | Workers, time/input budgets, cancellation, fuzz tests |
| Audio format promise is incorrect | User trust and compatibility failure | Choose and test a supported format; align UI/store wording |
| API provider changes terms or disappears | Network tool stops working | Provider review, abstraction, fallback/removal plan |
| Plugin adds a permission or data collection | Policy/privacy regression | Merged-manifest diff and SDK inventory on every release |
| Unlicensed data or dependency is distributed | Legal/takedown risk | License audit and generated third-party notices |
| No analytics makes support diagnosis difficult | Slow incident resolution | Play Vitals plus explicit redacted diagnostic export |
| Application size grows with 87 tool chunks | Lower install success | Per-chunk budgets, bundle analysis, lazy loading, remove unused assets |
| Locale/time-zone assumptions change results | Incorrect dates, currency, and timers | Locale/time-zone test matrix and visible assumptions |

## 16. Shared-code strategy between repositories

For the first Android release, make a clean extraction into the separate repository. Do not use Git submodules.

Organize pure algorithms so they can later become a versioned package such as:

```text
@yashcodes/tool-core
```

Only create that shared package when both repositories need frequent shared fixes. The package should contain framework-independent algorithms, validation, parsing, formatting, and fixtures. React UI and platform adapters should remain product-specific.

## 17. Estimated timeline

For one developer working consistently:

| Milestone | Estimate |
|---|---:|
| Product decisions and repository setup | 3–5 days |
| Application shell and platform layer | 1.5–2.5 weeks |
| Tier 1 tool migration | 2–4 weeks |
| Adapter-heavy tools | 2–3 weeks |
| QA, security, performance, and Play preparation | 2–3 weeks |
| **Internal vertical-slice alpha** | **Approximately 3–5 engineering weeks** |
| **Feature-complete closed beta** | **Approximately 7–10 engineering weeks** |
| **Public version 1** | **Approximately 9–13 engineering weeks** |
| **Near-complete safe parity** | **Approximately 13–18 engineering weeks** |

These ranges assume one experienced developer, substantial reuse of the existing tools, and no major native-plugin failure. PDF, audio, video, large-file streaming, or Play policy issues can extend the upper bound. The mandatory 14-day closed-test period, if applicable, can overlap final QA, store preparation, and later tool development, but production access and Play review time remain calendar dependencies.

## 18. First concrete milestone

The first milestone should not be all 87 tools. It should prove every major technical path with approximately 12 tools.

Suggested vertical slice:

- Unit Converter — pure calculation
- Timestamp Converter — date and live state
- Hash Generator — Web Crypto
- Markdown Preview — rendering and sanitization
- Regex Tester — text processing
- QR Generator — Canvas and image sharing
- JSON Editor — CodeMirror and file export
- Notes/Scratchpad — Preferences
- Pomodoro Timer — lifecycle and notifications
- Image Compressor — file import and generated output
- File Hash Checker — file limits and expensive processing
- Currency Converter — network, caching, and offline state

Milestone acceptance criteria:

- Runs from a signed debug APK on a physical Android phone.
- Works without a development server.
- All offline tools work in airplane mode.
- Native copy, share, files, storage, notifications, and Back behavior work.
- Tool routes survive rotation and process recreation.
- The architecture supports adding the remaining tools without new global patterns.

Once this vertical slice is stable, the remaining Tier 1 tools can be migrated rapidly and with much less architectural risk.

## 19. Non-functional requirements and budgets

These are internal engineering targets, not Google Play limits. Revisit them after profiling the vertical slice, but do not remove them without recording a replacement decision.

| Area | Version 1 target |
|---|---|
| Installed cold start | App shell usable within 2.5 seconds on the chosen mid-range reference phone |
| Tap feedback | Visible response within 100ms |
| Main-thread work | No unbroken JavaScript task longer than 50ms during ordinary interaction |
| Catalog scrolling | Sustained smooth scrolling without loading all tool components |
| Initial web payload | 500 KiB gzip or less, excluding lazy tool chunks |
| Normal lazy tool chunk | 250 KiB gzip or less; documented exception for CodeMirror, PDF.js, Math.js, and media |
| Play compressed download | Target 30 MiB or less for the common device configuration |
| Temporary cache | Global configurable ceiling, initially 100 MiB, with oldest-output cleanup |
| Network timeout | Connect/overall timeouts with a user-visible retry; no indefinite spinner |
| Offline operation | Every tool marked offline passes in airplane mode after cold launch |
| Data durability | Failed migration/export never destroys the last valid user copy |
| Accessibility | WCAG 2.2 AA for WebView content plus Android/TalkBack semantics |
| Reliability | No known crash, ANR, data-loss, permission loop, or navigation trap in enabled tools |

Google Play currently permits much larger app bundles, but larger downloads hurt acquisition and retention. Measure the delivered per-device size with `bundletool` and Play Console rather than the raw `.aab` file. [Android App Bundle size guidance](https://developer.android.com/guide/app-bundle/faq)

## 20. Data inventory and retention matrix

This matrix is the starting point for implementation, the privacy policy, and Play Data Safety. Re-audit it from the release artifact before submission.

| Data | Default persistence | Leaves device | Backup | Retention/control |
|---|---|---|---|---|
| Ordinary pasted tool input | Memory only | No | Excluded | Cleared when tool/session is discarded |
| Generated passwords, hashes, JWT content | Memory only | No | Excluded | Never logged or auto-saved |
| Selected file contents | Private temporary cache only when required | No | Excluded | Delete after processing/share retention window |
| Notes | Preferences/repository | No | Excluded | User can export, import, delete, or Clear All |
| Bookmarks | Preferences/repository | No, except when user opens a URL | Excluded | User can export, import, delete, or Clear All |
| Favorites and recent tools | Preferences | No | Excluded in strict local mode | Clear All and per-item removal |
| Settings/theme | Preferences | No | Excluded in strict local mode | Reset to defaults |
| Active timer state | Preferences while active | No | Excluded | Removed when completed/reset |
| Currency base/target codes | Cache plus request metadata | Yes, to Frankfurter | Cache excluded | Cache expiry and Clear All |
| DNS domain and record type | Memory for request/result | Yes, to Cloudflare | Excluded | Clear when screen/session is discarded |
| Audio recording | Temporary file until saved/shared | No | Excluded | Explicit save/share; cache cleanup |
| Diagnostic report | Created only by user action | Only if user sends it | Excluded | Redacted preview before share |

Google Play treats SDK behavior as application behavior, so this matrix must include anything later added by Capacitor/community plugins or telemetry libraries. [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469?hl=en)

For each network/SDK row, maintain the exact Play questionnaire fields: data type, collected versus shared, required versus optional, processing purpose, ephemeral-processing claim, transport encryption, retention, deletion method, and third-party recipient. Do not infer that a short-lived request is exempt; answer from the current Play definitions and provider behavior at submission time.

## 21. Localization, time, and numeric correctness

Version 1 can ship in English, but all user-visible application-shell strings must be externalized from the start. Tool data and output require additional rules:

- Use UTF-8 throughout and test non-Latin, emoji, combining, bidirectional, and zero-width text.
- Use `Intl` APIs for display formatting, but keep machine formats such as JSON, CSV options, timestamps, hashes, code, and generated configuration deterministic.
- Never parse localized numbers with a naive `Number()` call when the UI promises locale-aware input.
- Display the active time zone in date/time tools and let users choose UTC where relevant.
- Test daylight-saving gaps/overlaps, leap days, negative timestamps, 12/24-hour settings, and manual clock changes.
- Decide whether currency uses locale-formatted decimal output while preserving a copyable machine value.
- Keep layouts RTL-ready even if an RTL translation is not included in version 1.
- Do not advertise a language until the complete enabled-tool catalog and store listing are translated and reviewed.

If more languages are added, integrate with Android per-app language preferences rather than maintaining a disconnected custom setting. [Android per-app language preferences](https://developer.android.com/guide/topics/resources/app-languages?hl=en)

## 22. Definition of Done for one tool

A tool is `enabled` for production only when all applicable items pass:

### Functionality

- Catalog metadata, route, lazy import, and fallback work.
- Golden fixtures match expected output.
- Empty, invalid, boundary, and representative real input work.
- Product description and caveats accurately describe the implementation.

### Platform behavior

- Required platform capabilities use shared adapters.
- Back, pause/resume, process recreation, rotation, and theme change are handled.
- Offline/network classification is verified from a cold launch.
- Permission denial and later revocation have a recovery path.
- File tools pass content-URI, cancellation, low-space, and cleanup tests.

### UX and accessibility

- Compact, medium, expanded, portrait, and landscape layouts are usable.
- No unintended horizontal page scrolling occurs.
- Inputs have visible labels, suitable keyboards, help, and local errors.
- Every action has pressed, disabled, loading, success, and error states.
- Touch targets are at least 48dp with adequate separation.
- TalkBack name, role, state, order, and live updates are correct.
- Large text, high contrast, reduced motion, hardware keyboard, and non-color cues pass.

### Performance and safety

- Tool chunk meets its budget or has an approved exception.
- Long processing offers progress and cancellation and does not block the UI.
- Input/output limits are visible and enforced before expensive allocation.
- Sensitive input is neither persisted nor logged.
- Threat-model cases relevant to the tool pass.

### Release evidence

- Unit, component, adapter, and applicable Android tests pass.
- Physical-device smoke test is recorded.
- Dependency/license/attribution requirements are satisfied.
- Privacy/Data Safety and permission inventories remain accurate.
- Product owner marks the tool `enabled` in the signed release manifest.

## 23. Release gates

### Gate A — Architecture proven

- The 12-tool vertical slice runs from an internal Play build.
- Every platform adapter has contract tests.
- Edge-to-edge, predictive Back, file sharing, notification denial, backup exclusions, and process recreation pass.
- No critical architecture decision remains unresolved.

### Gate B — Closed beta ready

- Version 1 scope is frozen.
- Every included tool meets its Definition of Done.
- Privacy, Data Safety, permissions, third-party notices, SBOM, and store claims match the candidate artifact.
- No open critical/high security issue or known data-loss defect exists.
- Support, incident, and rollback procedures are documented.

### Gate C — Production ready

- Required closed testing is complete and production access is approved.
- Play pre-launch report issues are triaged.
- Crash/ANR and device compatibility results meet the internal acceptance threshold.
- App Links, signing, backup rules, 16 KB compatibility, target API, and store assets are verified from the uploaded AAB.
- The first-release managed-publishing/country plan or later-update staged-rollout percentage, owner, observation window, and stop conditions are approved.

## 24. Decisions required before implementation begins

The project can be scaffolded only after the first group is resolved; the second group must be resolved before closed beta.

### Required before scaffolding

- Final repository name
- Final application ID/package name
- Play Console owner and personal/organization account status
- Application name and basic brand direction
- Minimum SDK 24 and target SDK 36 confirmation
- Version 1 backup policy confirmation
- Free/no-ads/no-analytics default confirmation
- Paid-versus-free launch decision, acknowledging that a published free app cannot later become a paid download under the same package name
- Owned domain to use for privacy/support and optional App Links
- Production Capacitor scheme/hostname/origin
- Sensitive-screen and sensitive-clipboard defaults
- Reference mid-range physical device used for performance budgets

### Required before closed beta

- Exact version 1 tool manifest
- Audio output format and whether Audio Recorder is deferred
- File-size/page/duration limits confirmed by profiling
- API-provider terms and fallback decisions
- Privacy-policy and support URLs
- Store category, target audience, and content-rating answers
- Financial Features and export-law declaration approach
- Launch countries/regions and supported languages
- Tester recruitment plan
- Upload-key custody and recovery owner
- Production rollout and incident owner
- Timer behavior across reboot and delayed notifications
- Whether production uses any custom/community native plugin and who owns its maintenance

## 25. Sensitive output, clipboard, and screen privacy

The app generates or displays passwords, JWT content, HMAC keys/results, notes, hashes, bookmark URLs, and imported file content. Application sandboxing alone does not protect these values from clipboard previews, screen capture, the Android Recents thumbnail, keyboard learning, or a user intentionally exporting them.

### 25.1 Data sensitivity classification

Add sensitivity metadata to each tool and output action:

```ts
type DataSensitivity = "public" | "private" | "secret"

type ToolPrivacyPolicy = {
  inputSensitivity: DataSensitivity
  outputSensitivity: DataSensitivity
  persistByDefault: boolean
  allowScreenCapture: boolean
  clipboardMode: "normal" | "sensitive"
}
```

Suggested defaults:

- Passwords, tokens, HMAC secrets, JWT contents, and private keys: `secret`
- Notes, bookmarks, uploaded files, DNS queries, and generated contact/calendar records: `private`
- CSS, color, unit, reference, and ordinary text outputs: `public`, unless user content makes them private

### 25.2 Clipboard rules

- Extend the native Clipboard adapter to mark passwords, tokens, keys, and other secret output with `ClipDescription.EXTRA_IS_SENSITIVE` so Android 13+ does not reveal the value in the system clipboard preview.
- Avoid duplicate “Copied” messages on Android 13+, where the system already provides copy feedback. Keep an accessible in-app status for older versions and screen-reader users without showing the secret value.
- Clipboard read must occur only after a user taps Paste; never inspect the clipboard at launch, resume, or in the background.
- Offer a visible Clear Clipboard action for secret output. Timed clearing may be best-effort only because background clipboard access is restricted; never claim a secret was cleared unless the current clipboard value was safely verified and replaced.
- Explain that copying makes data available to the operating-system clipboard and potentially other apps. Sensitive clipboard marking hides previews but is not encryption or access control.

Android requires copied sensitive content such as passwords to be marked as sensitive. [Android clipboard guidance](https://developer.android.com/develop/ui/views/touch-and-input/copy-paste)

### 25.3 Screen and keyboard privacy

- Add an optional “Protect sensitive screens” setting, recommended on by default for secret-classified tools.
- When active, toggle `FLAG_SECURE` while a secret-classified route is visible, then remove it on exit. Test screenshots, screen recording, casting, task switching, and Recents thumbnails.
- Explain that screen protection prevents normal screenshots/casting on those screens; allow the user to disable it deliberately if their workflow requires screenshots.
- Do not apply `FLAG_SECURE` globally to ordinary conversion and design tools.
- Use `autocomplete="off"` or the correct secret/new-password value, `autocapitalize="off"`, and `spellcheck="false"` for secret inputs.
- Verify whether the Android IME can be told not to personalize/learn secret fields; if the WebView cannot guarantee it, state the limitation rather than claiming keyboard privacy.
- Never place secret material in notification content, app shortcuts, widgets, logs, accessibility hints, or diagnostic reports.

`FLAG_SECURE` blocks screenshots and non-secure displays for protected windows. [Android sensitive-activity guidance](https://developer.android.com/security/fraud-prevention/activities?hl=en)

### 25.4 Storage-security boundary

Capacitor Preferences/Android SharedPreferences in private mode are application-sandboxed, not end-to-end encrypted storage. Version 1 must not describe Notes or Bookmarks as encrypted at rest.

- Do not persist secret-classified tool input/output.
- Store Notes and Bookmarks only in private application storage with backup excluded.
- State that rooted devices, device compromise, unlocked-device access, accessibility malware, user exports, and screenshots outside protected screens are outside the protection of ordinary app sandboxing.
- If encrypted notes, an application lock, or secret vault is added later, design key generation, Android Keystore storage, recovery, migration, biometric fallback, and permanent data-loss behavior as a separate feature rather than adding ad hoc encryption.

## 26. Production WebView origin, CORS, and offline packaging

### 26.1 Freeze the production origin

The packaged app's scheme, hostname, and origin affect same-origin policy, storage, fetch, Web Crypto secure-context behavior, and routing. Choose and document them in the architecture proof. Changing the origin after release can orphan WebView-origin data and break CORS or security assumptions.

- Use Capacitor's supported HTTP(S)-style local origin rather than `file://` or opaque `data:` origins.
- Explicitly disable universal/file-URL access and mixed content.
- Allow native bridge injection only for the exact packaged application origin.
- Keep development-server URLs and cleartext exceptions out of internal and production variants.
- Add a release test that asserts `window.location.origin`, secure-context status, Web Crypto availability, and expected bridge origin.

Android recommends HTTP(S)-style local origins and warns against `file://` access for in-app WebView content. [Android local WebView content guidance](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content)

### 26.2 Prove CORS behavior early

Frankfurter and Cloudflare currently work from the website, but the production Capacitor origin is a different origin and may receive different CORS treatment.

The vertical slice must test both providers from:

- Browser development origin
- Android debug packaged origin
- Internal Play build
- Production-equivalent signed build

If browser `fetch` cannot meet CORS, TLS, timeout, or response-size requirements, implement a narrowly scoped native HTTP adapter for the two allowlisted providers. The native adapter must preserve the same privacy disclosure, cancellation, response validation, and no-secret rules. Do not disable WebView security or proxy arbitrary URLs merely to bypass CORS.

### 26.3 No service worker in the packaged app

Do not register a PWA service worker inside the Capacitor production build unless a later architecture decision proves a concrete need. The application assets are already packaged and versioned by the Play release. A service worker adds a second update/cache lifecycle that can serve mismatched HTML and JavaScript after an app upgrade.

- Remove or disable any inherited PWA registration.
- Version application data caches separately from executable assets.
- Test update from one Play build to the next without clearing user storage.
- Never solve a stale bundled-asset problem by clearing Preferences or user data.

### 26.4 Content Security Policy and worker packaging

Create the final CSP from observed requirements rather than copying a permissive web policy. Expected directives should keep scripts and application resources local, restrict `connect-src` to approved providers, allow only required `blob:`/`data:` image or media output, and permit only bundled Workers.

- Package PDF.js worker through Vite using a deterministic module-worker URL; do not rely on a postinstall copy that can silently fail.
- Package heavy Workers as application assets with stable error reporting when a chunk cannot load.
- Avoid `unsafe-eval`. Audit Math.js, CodeMirror, PDF.js, Markdown, and development tooling separately.
- Do not allow arbitrary remote images, iframes, scripts, fonts, stylesheets, or media in rendered Markdown/Open Graph previews.
- Intercept links rendered from Markdown and generated previews before navigation.
- Test CSP in the signed production variant because development servers commonly require weaker rules.

### 26.5 WebView cache, cookies, and memory

- Do not use cookies or WebView authentication state for version 1.
- Disable third-party cookies unless a later reviewed feature requires them.
- Treat HTTP cache as disposable and separate it from the explicit currency cache.
- Clear abandoned temporary blobs, Workers, media streams, audio contexts, Canvas backing stores, and file handles when leaving a tool.
- Measure both Android app-process memory and the separate WebView renderer process; ordinary `dumpsys meminfo` interpretation can otherwise undercount total WebView use. [Android WebView memory guidance](https://developer.android.com/topic/performance/memory/guide/webview-memory)

## 27. Standards compliance and hostile-file corpus

Matching the current website is useful for regression detection, but parity is not proof of correctness. Existing behavior can contain bugs. Each tool needs both parity fixtures and independent authoritative vectors.

### 27.1 Format and algorithm baselines

Document the exact standard/profile implemented by each applicable tool, including:

- Base64 alphabet, padding, text encoding, and URL-safe behavior
- URL component versus full-URL encoding semantics
- JSON number/string behavior and duplicate-key policy
- CSV delimiter, quoting, newline, BOM, and formula-injection policy
- YAML supported version/features and alias/anchor limits
- XML parser behavior, entity handling, namespaces, and formatting limits
- JWT decode versus signature verification behavior
- UUID version and RFC-compatible formatting
- Hash/HMAC algorithms, text encoding, uppercase/lowercase output, and known test vectors
- iCalendar escaping, CRLF line endings, line folding, UID, UTC/local time, and time-zone fields
- vCard version, escaping, line folding, Unicode, and filename behavior
- Unix timestamp seconds versus milliseconds and supported range
- Unit-conversion precision, rounding, and source constants
- Cron dialect, day-of-week numbering, time-zone assumption, and unsupported syntax
- SQL dialect assumptions
- Unicode normalization policy for length, reverse, duplicate, slug, diff, and invisible-character tools

Use published standards or trusted reference implementations for expected results. Keep the chosen standard URL/version beside the test fixtures.

### 27.2 File and media corpus

Maintain a licensed, non-sensitive test corpus covering:

- Empty, truncated, corrupt, malformed, and mislabeled files
- Extension/MIME/content mismatches
- Extremely large dimensions with small compressed size
- Transparent, animated, wide-gamut, CMYK, grayscale, and EXIF-rotated images
- Images containing EXIF/GPS metadata, verifying whether output preserves or strips it
- Password-protected/encrypted, damaged, image-only, text-heavy, and many-page PDFs
- PDFs with unusual page sizes, rotation, fonts, and embedded images
- Video with unsupported codec/container, variable frame rate, no audio, rotation metadata, and very short/long duration
- Audio interruption, no microphone, silent input, incoming call/audio focus, and unsupported encoder
- Files with long, Unicode, RTL, reserved-character, duplicate, or extensionless names
- Low-storage and output-larger-than-input cases

Do not store real personal documents, credentials, recordings, or customer data in fixtures.

### 27.3 Tool-specific correctness rules

- Image Compressor and palette extraction must normalize EXIF orientation and disclose whether metadata is stripped.
- PDF tools must detect unsupported encryption and fail without partial misleading output.
- iCalendar and vCard generation must escape newlines, separators, and user text according to the chosen version.
- CSV output must prevent spreadsheet formula execution by policy or present an explicit warning/mode.
- DNS must normalize internationalized domains deliberately and display both user form and ASCII/Punycode form where relevant.
- Hash tools must label MD5 and SHA-1 as legacy/insecure for collision resistance while retaining them only for compatibility checks.
- Password generation tests must use injectable deterministic randomness only in tests; production must use secure randomness.
- Color contrast and color-blindness tools need reference colors and numerical tolerances, not screenshot-only tests.

## 28. Timer, notification, interruption, and reboot semantics

The plan must define what “timer works in the background” actually means without promising alarm-clock precision.

### 28.1 Timer clocks

- Stopwatch should use a monotonic elapsed clock while running in one boot session so manual wall-clock changes do not change elapsed duration.
- Countdown and Pomodoro should persist a wall-clock target plus enough state to reconstruct progress after process death.
- Detect significant manual clock/time-zone changes and show a corrected state rather than silently continuing from stale interval counts.
- Test daylight-saving changes even when the duration itself should remain constant.

### 28.2 Notification channels and privacy

- Define stable channel IDs before public release because users control channel behavior after creation.
- Use a dedicated low-noise timer channel and do not create a new channel per tool/version.
- Use deterministic notification IDs so Reset/Cancel removes the correct notification.
- Notification actions must be idempotent and safe when the WebView process does not exist.
- Lock-screen text should be generic and never contain user-entered notes, URLs, secrets, or clipboard contents.
- If notifications are disabled or delayed by Doze/OEM battery policy, the foreground timer remains correct and the Help screen explains the limitation.

### 28.3 Reboot and update behavior

Version 1 default:

- Persist the active timer state across process death and app update.
- Do not promise that a notification will fire across device reboot unless the implementation explicitly reschedules it through a reviewed boot receiver.
- On first launch after reboot, reconstruct whether the timer completed and show the result.
- If reboot rescheduling is later enabled, review `RECEIVE_BOOT_COMPLETED`, plugin manifest additions, backup/restore behavior, and exact-alarm implications.
- Cancel obsolete pending notifications during schema migration, logout-equivalent Clear All, tool removal, and application upgrade.

Test Samsung, Pixel, and at least one aggressively battery-optimizing OEM before claiming dependable background alerts.

## 29. Product validation, pricing, and store positioning

Technical reuse does not by itself establish a successful Play product. Add a short product-validation track before committing to the public tool count.

### 29.1 Target user and value proposition

Draft and validate one primary statement, for example:

> Fast, privacy-conscious developer and everyday utilities that work offline without accounts or ads.

Choose a primary audience rather than marketing 87 unrelated features equally. Candidate groups include software developers, students, technical support staff, designers, and privacy-conscious power users.

Before the closed beta:

- Review current Play competitors, their tool selection, ratings themes, pricing, permissions, download sizes, and common complaints.
- Interview or observe 5–8 representative users.
- Ask beta testers to card-sort categories and identify the 15 tools they would keep installed for.
- Validate search terms, category names, first-run comprehension, and whether Favorites/Recent solve catalog scale.
- Define a version 1 “hero set” for screenshots and description rather than listing every minor utility.
- Use only real application screenshots and real user reviews/ratings; never fabricate store proof.

Google Play requires meaningful, stable, responsive functionality rather than a thin or broken wrapper. [Google Play functionality and user-experience policy](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en)

### 29.2 Pricing decision

Decide paid versus free before first public availability. Google Play permits changing a paid app to free, but once an app has been offered for free it cannot later become a paid download without creating a new package/listing. [Google Play app pricing](https://support.google.com/googleplay/android-developer/answer/6334373?hl=en)

Recommended version 1 remains free, no ads, and no in-app purchase. If premium digital tools, subscriptions, donations tied to features, or ad removal are added later, conduct a Google Play Billing and Data Safety design first. Play-distributed digital functionality generally must use Google Play's billing system unless an explicit policy exception applies. [Google Play payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)

### 29.3 Distribution and listing decisions

- Choose launch countries/regions deliberately based on support capacity, API availability, privacy-policy applicability, and localization.
- Choose Tools versus Productivity category after competitor and keyword review.
- Reserve the package name and app name, but do not assume a name is legally available because Play Console accepts it.
- Keep store claims tied to the signed enabled-tool manifest.
- Publish known limitations for network, large-file, notification, and media features.
- Provide a support response target and a security-report acknowledgment target.
- Do not ask users to include private tool input in public Play reviews or support messages.
- Keep version 1 account-free. If accounts/cloud sync are added later, add account deletion, server retention, authentication, abuse prevention, and backend incident response before implementation.

The privacy policy must be active, public, non-geofenced, non-editable, and not a PDF, and it must identify the app/developer and retention/deletion behavior. [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)

### 29.4 Explicit version 1 exclusions

Unless separately approved, version 1 excludes:

- Accounts, cloud sync, and server-stored user content
- Advertising, analytics SDKs, subscriptions, and in-app purchases
- Remote executable-code/live-update systems
- Exact-alarm permission and alarm-clock guarantees
- Background microphone recording
- Broad media, storage, contacts, or installed-package permissions
- Inbound share targets and arbitrary “Open with” file handling
- Widgets, Wear OS, Android TV/Auto, Chrome extensions, and iOS
- YouTube downloading or other third-party media-download workflows
- Encrypted vault, app lock, or claims that Notes/Bookmarks are encrypted at rest

Record any scope change as an architecture/privacy/policy decision before implementation, not as a late plugin addition.

## 30. Concrete testing tools and test-oracle strategy

### 30.1 Tooling selection

Use a deliberately layered test stack:

- Vitest for pure algorithms, schemas, time logic, and adapter contracts
- React Testing Library for tool components and accessibility states
- Playwright for the browser harness, routing, responsive layouts, and visual regression
- JUnit/Robolectric for custom Android plugin and manifest-adjacent logic where applicable
- Android instrumented tests with Espresso/Espresso-Web for the Activity/WebView boundary
- UI Automator for system permission dialogs, document/photo pickers, share sheet, notification settings, and external browser transitions
- Gradle Managed Devices for repeatable API-level smoke tests
- Physical devices for microphone, audio focus, OEM battery behavior, real file providers, IME, memory, and GPU/Canvas behavior
- Accessibility Scanner and manual TalkBack/switch-access testing
- `bundletool`, Android Lint, Play pre-launch report, Chrome DevTools Performance, Android Studio Profiler, and `dumpsys` for release diagnostics

Do not treat Playwright browser success as proof that a Capacitor/native path works.

### 30.2 Independent test oracles

For each pure tool, record whether expected output comes from:

- Published standard test vector
- Hand-calculated boundary case
- Trusted independent implementation
- Existing website parity only
- Visual/manual judgment

No security, encoding, date, or format generator should rely exclusively on existing website parity. When parity conflicts with the governing standard, fix both products or document the deliberate compatibility behavior.

### 30.3 Visual and accessibility regression

- Capture compact/medium/expanded screenshots in light/dark and large-text configurations.
- Mask only genuinely nondeterministic values; do not make broad screenshot tolerances hide layout regressions.
- Add automated checks for viewport overflow, clipped focused controls, missing accessible names, duplicate IDs, invalid heading order, and content hidden under system bars.
- Manually verify dynamic content announcements and complex Canvas/CodeMirror interactions because automated accessibility scans are insufficient.

### 30.4 Flake and fixture governance

- Freeze time, locale, time zone, network, and deterministic test randomness where required.
- Keep third-party network tests out of the blocking unit suite; use contract fixtures plus scheduled provider smoke tests.
- Quarantine may isolate a flaky test temporarily, but cannot count as a release pass.
- Store fixture provenance/license and an expected-output explanation beside each corpus.
- Rotate malformed/security corpus cases as parsers and dependencies change.

## 31. Reference data, tool deprecation, and content lifecycle

Several tools bundle reference/content datasets that can become stale even though the executable code still works.

### 31.1 Reference-data manifest

For HTTP statuses, MIME types, Unicode/emoji, currency codes, fake-data vocabularies, time zones, and other bundled data, record:

- Source authority and URL
- Source version/date
- License and attribution
- Transformation script/version
- Last checked date
- Maintainer/owner
- Tests for duplicates, invalid entries, and expected coverage

Prefer reproducible generated data over manually edited copies. Review time-sensitive datasets on a scheduled cadence.

### 31.2 Tool lifecycle states

Use explicit catalog states:

```text
internal -> experimental -> enabled -> deprecated -> removed
```

- `internal`: development and QA only
- `experimental`: opt-in internal/closed testing with visible limitations
- `enabled`: passes Definition of Done and may appear in store claims
- `deprecated`: still works, explains replacement/removal date, and supports data export
- `removed`: route displays migration/help information when needed rather than crashing old deep links

Removing Notes, Bookmarks, timers, or another persistent tool requires an export/migration path. Removing a network tool requires clearing its cache and updating privacy/store disclosures. Never silently reuse an old tool ID for unrelated behavior.

### 31.3 Update compatibility

- Maintain migration tests from the oldest supported production version.
- Keep route aliases for renamed tools.
- Do not delete user data merely because a tool component fails to load after an update.
- Version Worker messages, import/export schemas, and native bridge contracts.
- Define downgrade as unsupported unless an explicit safe path exists; staged rollout rollback must not install an older schema over newer incompatible data.
- Before rolling back, verify data-schema compatibility or ship a forward-fix build with a higher version code.

## 32. Runtime recovery, memory pressure, and application lifecycle

A tool can pass ordinary functional tests and still fail when Android kills an Activity, the WebView renderer exits, the device rotates, or the system reclaims memory. Recovery behavior must therefore be an application feature, not an implicit browser behavior.

### 32.1 State classification and restoration policy

Classify every piece of state before implementing persistence:

| State class | Examples | Recovery rule |
|---|---|---|
| Durable user data | Notes, Bookmarks, Favorites, Settings | Transactional persistence, schema migration, explicit Export/Import/Clear All |
| Safe session state | Current tool ID, catalog query, category, non-sensitive option toggles | May be restored after Activity/process recreation when version-compatible |
| Sensitive session state | Password/JWT/private-key input, pasted confidential text, selected file contents | Never automatically persist or restore |
| Active operation state | File conversion, hash progress, PDF render, audio recording | Persist only a safe operation ID/metadata when resumable; otherwise cancel and explain |
| Disposable data | Object URLs, decoded bitmaps, parser buffers, temporary output, network cache | Rebuild or delete; never depend on it for user-owned data |

- Each tool declares its state class in the registry or an adjacent `tool-runtime-policy` record.
- Route restoration must validate the tool ID against the current enabled manifest. A removed or disabled tool opens a safe explanation screen.
- Do not restore a secret merely because the browser/WebView offers form-state restoration. Disable history/form caching for secret fields and clear component memory on exit.
- Save durable writes before `pause` without blocking the UI indefinitely. Use atomic commits and retain the last validated state after an interrupted migration.
- A pending Android picker, permission, share, or notification result must be correlated with a stable operation ID so Activity recreation cannot deliver it to the wrong tool.
- “Clear All,” Android Settings → Clear storage, uninstall, reinstall, and device transfer must each have documented and separately tested outcomes.

### 32.2 WebView renderer termination

Implement a custom host recovery path for `WebViewClient.onRenderProcessGone` on supported Android versions:

1. Stop referring to the dead WebView; remove it from the view hierarchy and destroy it.
2. Cancel or invalidate pending bridge calls so promises do not hang or later resolve into a different tool session.
3. Create a new WebView instance with the same hardened settings rather than reusing the dead instance.
4. Restore only the last safe route and non-sensitive session state.
5. Show a plain recovery explanation and give the user `Reload app`, `Open catalog`, and `Send diagnostic` actions.
6. If termination repeats during startup or on the same tool, enter a native-host safe mode that can clear disposable caches and open Help without deleting Notes or Bookmarks.

The native recovery screen must not itself depend entirely on a functioning WebView. API 24–25 still require process-level restart/restoration testing even though the modern renderer callback is unavailable there. Test renderer termination in debug/instrumented builds and verify that the process does not enter a reload loop. [Android WebView termination guidance](https://developer.android.com/develop/ui/views/layout/webapps/handle-termination)

### 32.3 Memory-pressure behavior

- Treat the WebView renderer as a separate major memory consumer when profiling PDF, image, chart, CodeMirror, Math.js, GIF, and audio workflows.
- Respond to applicable `onTrimMemory` signals by releasing native previews, temporary files, inactive WebViews, cached bitmaps, and other rebuildable native resources. Compare trim levels by threshold, not equality, because Android can add levels and has deprecated some older level constants.
- Forward a narrow memory-pressure/lifecycle event to the bundled UI so it can revoke object URLs, terminate idle Workers, release Canvas backing stores, close media tracks/AudioContexts, and drop disposable ArrayBuffers.
- Cancel heavy work when the UI is hidden unless the operation has an explicitly designed background execution model. Version 1 does not add a generic background worker merely to keep conversions alive.
- Check free disk space and estimated decoded memory before beginning large operations; file byte size alone does not bound decoded image/PDF memory.
- Never call garbage collection explicitly as a recovery mechanism.

[Android memory callbacks](https://developer.android.com/reference/android/content/ComponentCallbacks2.html)

### 32.4 Lifecycle recovery acceptance tests

- Rotate, resize, fold/unfold, background, foreground, lock/unlock, and switch theme during each representative tool.
- Enable “Don't keep activities” and exercise picker, permission, share, Save As, and notification flows.
- Kill the application process from ADB while a durable write, timer, and non-resumable conversion are in progress.
- Terminate the renderer during catalog startup and during each high-memory representative tool.
- Revoke notification/microphone access from system settings while the app is backgrounded.
- Update from the oldest supported production schema with an active timer and populated Notes/Bookmarks.
- Verify that recovery never resurrects secrets, duplicates files, repeats external intents, or silently reports an interrupted operation as successful.

## 33. Privacy-preserving support, diagnostics, and security reporting

Version 1 deliberately excludes an analytics/crash-upload SDK. That choice needs a usable support system, otherwise real device failures cannot be diagnosed.

### 33.1 Error taxonomy

Define stable, content-free error codes by layer:

```text
UI_*       validation, route, rendering, unsupported state
FILE_*     picker, URI, MIME, size, disk, read, write, share
NET_*      offline, DNS, TLS, timeout, provider status/schema/rate limit
WORKER_*   unavailable, timed out, cancelled, crashed
WEBVIEW_*  incompatible, unresponsive, renderer gone
NATIVE_*   permission, bridge, lifecycle, plugin failure
DATA_*     migration, import, corruption, unsupported schema
```

- User-facing messages state what happened and the next safe action; they do not expose a stack trace.
- Logs and diagnostic records contain only error code, app/build/WebView version, tool ID, lifecycle stage, and coarse device/API class.
- Never record raw exception messages from parsers/providers until they pass a redaction allowlist; these messages can echo user input, URLs, filenames, or server details.
- Keep only a small bounded local ring buffer and clear it through Clear All. It is not uploaded automatically.
- A user-triggered report shows a complete preview and lets the user cancel before the Android share sheet opens.
- Redaction itself has unit tests with secrets, paths, domains, Unicode, long inputs, and malicious exception strings.

### 33.2 Support surface

Bundle an offline Help/About area containing:

- Tool limits and local-versus-network behavior
- Permission explanations and system-settings recovery steps
- Timer/background limitations
- Import, Export, Clear All, uninstall, and backup behavior
- App version, version code, WebView version, and enabled-tool manifest version
- Privacy summary and full privacy-policy link/text
- Open-source notices
- Support and security-reporting contacts

The required support email must remain monitored and verified. The privacy policy must identify the app or publishing entity and provide a privacy contact/mechanism; this remains required even if the final Data Safety answer says that no covered data is collected. [Google Play User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311), [Google Play user-support guidance](https://support.google.com/googleplay/android-developer/answer/113477)

Support forms and email templates must say not to attach passwords, tokens, private files, notes, recordings, or sensitive DNS queries. Use synthetic reproduction inputs whenever possible.

### 33.3 Vulnerability intake and response

- Publish `/.well-known/security.txt` or a clearly linked security page on the owned support domain.
- State a monitored contact, supported app versions, preferred report format, acknowledgment target, and coordinated-disclosure expectations.
- Maintain severity definitions and a private incident log that contains no user tool content.
- Prepare a fast-forward patch route for compromised dependencies, unsafe parsers, exposed provider behavior, and signing/repository incidents.
- Do not add Play Integrity in version 1 by default. With no account, purchase, privileged backend, or high-value server action, it adds complexity and data/policy surface without a defined enforcement decision. Reconsider it only alongside a backend abuse case and a tiered failure policy.

## 34. Play release control, rollback, and service-continuity runbook

### 34.1 First release versus later updates

Google Play's percentage-based staged rollout applies to updates, not an application's first production publication. Therefore:

- De-risk the first launch through internal testing, required closed testing, optional open testing, a limited initial country set, pre-launch reports, managed publishing, and a staffed release window.
- Submit with at least a one-week review buffer when scheduling matters; approval time is not a deterministic deployment step.
- Use managed publishing to coordinate an approved bundle, listing, privacy text, and country changes, while recording which Play changes are exceptions and can still publish immediately.
- Use 5%/10%/25%/50%/100% staged updates only after the application already has a production release, with a minimum observation window and named approver at each step.

[Google Play release preparation](https://support.google.com/googleplay/android-developer/answer/9859348), [managed publishing](https://support.google.com/googleplay/android-developer/answer/9859654), and [staged updates](https://support.google.com/googleplay/android-developer/answer/6346149)

### 34.2 What halt, rollback, and unpublish actually mean

- Halting a staged update prevents additional users from receiving it; users who already installed that build remain on it. A higher-version-code forward fix is still required.
- Before relying on Play's fully rolled-out release halt, verify current eligibility and the previous artifact/data-schema compatibility. Affected devices do not magically downgrade.
- Unpublishing stops new discovery/install but does not disable existing installations, erase them, or prevent existing users from receiving updates. It is not an emergency kill switch.
- Because version 1 has no remote feature-flag backend, an unsafe offline tool requires a new signed release. A broken network provider can fail closed with a clear message, but code must not download an executable replacement.
- Never “roll back” by uploading a lower version code or by installing an older binary over a newer incompatible schema.

[Google Play update/unpublish behavior](https://support.google.com/googleplay/android-developer/answer/9859350), [staged-rollout halt behavior](https://support.google.com/googleplay/android-developer/answer/6346149), [fully rolled-out release halt](https://support.google.com/googleplay/android-developer/answer/16285429)

### 34.3 Release and incident runbook

For every release, archive:

- Source commit and signed Git tag
- Lockfile, tool/reference-data manifest, SBOM, third-party notices, and Data Safety snapshot
- AAB hash, version code/name, ProGuard/R8 mapping, native symbols, merged manifest, permissions diff, and `bundletool` output
- Test report, known limitations, migration version, rollback/forward-fix assessment, and Play artifact ID
- Store copy/screenshots and the exact privacy/help content shipped with that build

Incident procedure:

1. Classify user-data/security impact and affected versions/tools.
2. Halt the current update when applicable; do not assume this repairs installed devices.
3. Disable provider access locally only when an already-shipped fail-closed path exists; otherwise prepare a forward fix.
4. Preserve evidence without copying user content into tickets/logs.
5. Build and test a higher-version-code fix from a clean checkout.
6. Update users through release notes, support status, and in-app messaging included in the fix.
7. Reconcile Play declarations, privacy copy, notices, and postmortem actions.

Define recovery objectives for operational assets even though user data is local:

- Repository and release metadata: recoverable from an independent backup within one working day.
- Upload-key recovery instructions and credentials: stored in two independently controlled secure locations and tested before public launch.
- Privacy/support website: restorable independently of the portfolio deployment.
- Provider/network outage: offline tools remain usable; affected tools fail closed and show provider/status information.

## 35. Repository governance, traceability, and supply-chain operation

The new repository is separate, but it still needs a controlled relationship with the portfolio source and a reproducible release trail.

### 35.1 Repository controls

- Protect the default branch: required CI, no force pushes, no unsigned/unreviewed production tags, and no direct production signing from pull-request jobs.
- Add `CODEOWNERS` or an equivalent ownership file even for a solo project; the same person may hold several roles, but review, release, signing, privacy, and incident responsibilities must be explicit.
- Use least-privilege CI tokens, pin third-party CI actions by immutable commit, and keep signing keys/service-account credentials out of forks and untrusted PR workflows.
- Generate builds from a clean checkout with pinned Node, package manager, JDK, Gradle wrapper, Android Gradle Plugin/Kotlin, Android SDK, Capacitor, and lockfile versions.
- Retain the exact source and metadata needed to reproduce each public build for the supported lifetime.
- Test repository backup restoration and upload-key recovery before production rather than merely documenting them.

### 35.2 Decisions and traceability

Store lightweight Architecture Decision Records for at least:

- Application ID and signing/account ownership
- Production WebView origin and CSP
- Backup/local-only policy
- Native HTTP fallback decision
- File/URI and large-file strategy
- Timer/notification semantics
- Tool inclusion/removal policy
- Analytics/crash-reporting exclusion or later addition
- Monetization and target-audience decisions

Each ADR records status, date, owner, evidence, alternatives, consequences, and revisit trigger. Each tool delivery issue links:

```text
source commit/path
-> tool registry entry and runtime policy
-> requirements/standards profile
-> unit/integration/visual/accessibility fixtures
-> permission/data/network rows
-> enabled release-manifest entry
-> store/help claims
```

No tool is considered ported merely because its component compiles.

### 35.3 Web/app drift management

- The Android repository is authoritative for its platform shell and release settings; the portfolio remains authoritative only for the original web implementation until a shared package is deliberately introduced.
- Maintain `docs/upstream-sync.md` with the last reviewed portfolio commit and per-tool divergences.
- When a correctness/security fix applies to both products, open linked issues in both repositories and port tests before or with the fix.
- Do not overwrite Android-specific behavior during bulk copies from the portfolio.
- Avoid Git submodules or direct cross-repository source imports for version 1. If shared packages are introduced later, publish immutable versions and test both consumers before promotion.

### 35.4 Dependency operation

- Review runtime, license, permission, size, network, and native-binary impact before accepting any dependency.
- Run scheduled vulnerability and outdated-dependency checks, but batch routine upgrades through tests instead of auto-merging them into production.
- Define an emergency update path for actively exploited dependencies and a normal monthly maintenance window.
- Review package install scripts and lockfile changes; block unexpected repositories, binary downloads, permissions, exported components, or network hosts.
- Remove dependencies that are unused, unmaintained, or disproportionate to one small tool.

## 36. UX content, accessibility, and file interoperability completion

The `ui-ux-pro-max` review reinforces Material 3-style Android interaction, light/dark parity, adaptive layouts, 48 dp touch targets, immediate press feedback, clear recovery actions, and system-font/offline asset use. The application should carry these as acceptance criteria, not just visual preferences.

### 36.1 Complete state model for every screen

Every catalog and tool screen must deliberately implement the applicable states:

- Initial/empty with an example or clear next action
- Editing/dirty and valid/invalid input
- Loading with progress when measurable and cancellation for long work
- Success that identifies what changed or where output went
- Offline/stale for network tools
- Permission denied, including “don't ask again” settings recovery
- Unsupported WebView/API/format and over-limit input
- No disk space, interrupted operation, process recovery, and renderer recovery
- Disabled/deprecated/removed tool route

Errors must be near the affected control, announced to assistive technology, and include a recovery path. Toasts cannot be the sole location of important information. Destructive actions need confirmation or safe Undo, and dismissal with unsaved non-sensitive work needs an explicit decision.

### 36.2 Accessibility acceptance

- Use semantic HTML/native roles, visible labels, logical headings, and route-change focus management.
- Keep all touch targets at least 48 × 48 dp with at least 8 dp separation where adjacent actions are easy to confuse.
- Test TalkBack, Switch Access, keyboard navigation, magnification, 200% text, bold/high-contrast text settings, reduced motion, color correction, and both navigation modes.
- Do not communicate status through color, motion, haptics, or icon shape alone.
- Canvas/chart output needs an equivalent text summary or table; exact values must be reachable without hover.
- Code editors need an accessible plain-text fallback or a documented limitation verified with representative assistive-technology users.
- Do not apply screen-capture blocking globally in a way that prevents accessibility/help workflows; any sensitive-screen protection remains narrowly scoped and tested.
- Publish a short accessibility/help statement with supported workflows, known limitations, and a contact path.

### 36.3 Share/export interoperability

For every generated format, the tool registry records canonical extension, MIME type, character encoding, line-ending policy where relevant, filename template, maximum output, and whether Save, Share, Copy, or Preview is supported.

- Share using a narrow read-only `content://` grant and a correct MIME type; never expose a private filesystem path.
- Test exports in at least two independent receiving apps where the format is meant to interoperate.
- Test receivers that copy immediately, read lazily, reject an unknown MIME type, or retain access after the temporary grant expires.
- Use UTF-8 deliberately and emit BOM only for a documented compatibility mode.
- Sanitize display names without silently changing the actual data format.
- Warn before exporting unencrypted Notes/Bookmarks or spreadsheet-executable CSV content.
- Preview and Share/Save must refer to the same finalized bytes; do not regenerate nondeterministic output between those actions.
- Cancelled shares/saves are neutral outcomes, not success or failure telemetry.

### 36.4 Offline help and honest product language

- Bundle core Help, privacy summary, license notices, format descriptions, limits, and network-provider disclosures so they remain available offline.
- Do not promise “all processing stays on device” while Currency or DNS is enabled. Prefer “most tools work locally; network tools are clearly labeled.”
- Do not describe Notes/Bookmarks as encrypted or backed up unless the implementation and manifest prove it.
- Do not call best-effort notifications alarms or promise exact background delivery.
- Do not advertise 87 tools unless 87 release-manifest entries pass the Definition of Done and are enabled in the submitted artifact.
- Request an in-app rating only after a genuine successful outcome, never gate functionality on a review, and never interrupt first-run or error recovery.

## 37. Final decision register and execution-readiness gate

The following are intentional unresolved choices, not omissions. Assign each a named owner and due date.

### Before repository scaffolding

- Final app name, repository name, immutable application ID, publisher identity, and Play account type
- Supported countries, default language, primary audience, and whether children are excluded from the target audience
- Free/paid decision and a written version 1 monetization exclusion
- Production local WebView scheme/hostname/origin
- App Link requirement and owned domain
- Strict local-only backup choice
- Exact version 1 tool manifest, hero tools, and deferred/experimental list
- Android min/target SDK and supported WebView baseline

### Before closed testing

- Signed results of production-origin CORS tests for Frankfurter and Cloudflare and the native HTTP fallback decision
- Provider terms, privacy, attribution, rate limits, country availability, and removal behavior
- Final permission budget, data inventory, threat model, dependency/license inventory, and reference-data sources
- Export/import schema, timer semantics, recovery state matrix, and error-code registry
- Support/privacy/security contacts and public URLs
- Store positioning supported by competitor/user-validation evidence
- Accessibility test devices/users and known-limitation policy
- Decision on whether Audio Recorder or Video to GIF meets release quality; YouTube Downloader remains excluded unless separately re-reviewed

### Before production

- Enabled-tool manifest matches the AAB, help, privacy text, screenshots, descriptions, and Data Safety answers
- Personal/organization account verification, package registration, public contact exposure, and regional publisher/trader/legal obligations are reviewed for the chosen launch regions
- Target audience, content rating, ads, app access, Financial Features, export-law, permissions, and Data Safety declarations are complete
- Closed-test eligibility is satisfied where required; tester findings have disposition records
- Signing/key recovery, clean-build reproduction, backup restoration, incident, halt, forward-fix, and unpublish runbooks have been rehearsed
- First-release managed-publishing plan or later-update staged-rollout plan is approved with a staffed observation window
- No open blocker exists against the release gates in Section 23

### Definition of Ready for implementation work

A phase or tool ticket can start only when it has:

- Scope and explicit exclusions
- Design/runtime state policy
- Acceptance criteria and independent oracle
- Data, permission, network, file, and persistence classification
- Accessibility, compact/expanded layout, offline, error, cancellation, and recovery cases
- Dependency/standard source and known device risk
- Owner, estimate, prerequisites, and release milestone

Keep an evidence-linked checklist rather than marking decisions complete from memory. Time-sensitive Play/Android answers must include their verification date.

## 38. Gap-audit conclusion

The plan now covers both the original architecture and the less-visible production boundaries:

- Android 15/16 edge-to-edge, adaptive windows, and predictive Back
- Exact-alarm, notification, reboot, Doze, and foreground microphone semantics
- Android Auto Backup versus the local-only privacy promise
- Sensitive clipboard flags, screen/Recents privacy, keyboard behavior, and unencrypted-storage limits
- Production WebView origin, CORS proof, CSP, worker packaging, service-worker avoidance, cookies, and renderer memory
- Verified App Links and the companion website routing change
- Content URI, FileProvider, streaming, file limits, cache retention, and low-storage behavior
- Standards-based correctness, independent test oracles, malformed-file corpora, and metadata behavior
- Tool-specific accuracy and safety disclosures
- Regex/parser denial-of-service controls
- Third-party licenses, API terms, SDK behavior, notices, and SBOM
- Localization, time-zone, numeric correctness, and reference-data freshness
- Product validation, store positioning, irreversible pricing choice, and future billing boundary
- Concrete native/browser test layers, release-artifact validation, signing recovery, and rollback
- Post-launch maintenance, tool deprecation, schema compatibility, and Data Safety reconciliation
- Renderer termination, memory pressure, Activity/process recreation, safe mode, and sensitive-state restoration rules
- Privacy-preserving diagnostics, offline help, vulnerability intake, and support ownership
- First-release versus update rollout constraints, managed publishing, halt/unpublish semantics, and forward-fix operation
- Repository/release traceability, clean-build recovery, cross-repository drift, and dependency governance
- Export/share MIME interoperability and complete success/empty/error/recovery UX states
- Explicit pre-scaffold, pre-beta, and pre-production decision gates
- Realistic schedule, performance budgets, per-tool Definition of Done, and release gates

This document is now a suitable implementation baseline, not a substitute for the required kickoff decisions. Time-sensitive Android, Capacitor, provider, dependency, and Google Play requirements must be revalidated at kickoff and before every submission because they change independently of the codebase.
