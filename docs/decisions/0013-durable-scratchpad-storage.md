# ADR 0013: Durable Scratchpad Storage, Schema Migration, and Unencrypted Honesty

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: a second durable tool ships (it must reuse this schema/migration pattern), multi-note support is requested, or backup/data-transfer policy is reopened (ADR 0002).

## Context

Notes/Scratchpad is the repository's first durable tool data. The audited upstream implementation stores one plain-text scratchpad in `localStorage` with no versioning, no migration, and an auto-save that can overwrite stored content before it is read. Repository rules require durable data to be versioned and migratable (AGENT.md Section 12), require explicit confirmation for clearing, forbid claiming encryption that does not exist, and require the Settings Clear-all wording to be updated whenever durable data is introduced. Android backup and device transfer are already excluded (ADR 0002), so this data lives only in app-private storage.

## Decision

Enable the `notes-scratchpad` tool with a versioned single-document storage model:

- **Storage location**: the platform `PreferenceStore` under `notes:scratchpad` inside the existing `yash-tools:v1:` namespace. No new platform contract is introduced, and `preferences.clear()` — the Settings "Clear local preferences" action — therefore removes the note along with theme, favorites, and recents.
- **Versioned schema** (`notes.ts`): stored shape `{ schemaVersion: 1, text, updatedAt }`. Every load passes through `migrateNote`: corrupt payloads start fresh; payloads written by a _newer_ schema version are reported as `newer-schema`, left untouched on disk, and block editing, so an older binary can never destroy data from a newer one. No pre-version-1 schema ever shipped, so anything below 1 is corrupt.
- **Save discipline**: autosave debounced at 500 ms, blocked until the initial load settles (a slow store can never be overwritten with the empty initial state), skipped when the text is unchanged, and refused when the 256 KiB UTF-8 bound is exceeded — the durable copy always satisfies the documented limit and the previous note is preserved.
- **Unencrypted honesty**: the tool hint and the Settings local-data panel state plainly that the note is plain text in app-private storage, unencrypted, not backed up, not recoverable after clearing, and removed with the app.
- **Explicit deletion**: Clear requires a two-step arm-then-confirm (3 s timeout) and removes the storage key entirely. Settings Clear-all confirmation text now enumerates the scratchpad note.
- **Export/import**: Share/Save as UTF-8 `scratchpad.txt` through the file bridges; Import requires the same two-step confirmation (it replaces the note), goes through the SAF picker with a 256 KiB read bound, and decodes with a non-throwing UTF-8 decoder so hostile bytes cannot crash the import. Cancellation surfaces as a distinct no-op status.

## Alternatives considered

- **A dedicated notes database (SQLite)**: rejected for one plain-text document; the JSON preference store with a versioned schema is sufficient and reuses existing reviewed adapters.
- **Encrypting the note**: rejected for version 1; real encryption needs a reviewed key-management design, and pretending otherwise is forbidden. The UI instead states the truth.
- **Invisible migration from `localStorage`**: rejected; the upstream portfolio site is a different origin and app. No migration source exists.
- **Multi-note list UI**: rejected for this milestone; the audited tool is a single scratchpad, and the durable-storage pattern is the milestone's goal. A multi-note upgrade later becomes schema version 2 under this same migration gate.

## Consequences

- The first durable-data pattern is proven: versioned payload, migration gate, load-before-save, bounded writes, explicit deletion, and honest unencrypted copy. Future durable tools must follow it.
- Android backup exclusion (ADR 0002) means the note is lost on uninstall or device transfer; users are told to export a note they care about.
- The Settings screen now derives its enabled-tool count from the registry and its storage claims from the actual durable data set.
- Device evidence (real PreferenceStore persistence across process death, share sheet, SAF import, TalkBack) remains assigned to issues #17/#18; automated, E2E (reload persistence), and artifact gates pass.
