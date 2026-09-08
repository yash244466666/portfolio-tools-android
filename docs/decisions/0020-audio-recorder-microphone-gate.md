# ADR 0020: Audio Recorder Microphone Permission Gate

- Status: Proposed (pending product-owner decision recorded in `docs/release-reviews/audio-recorder-review.md`)
- Date: 2026-09-08
- Owner: Yash Sikdar
- Revisit when: the Audio Recorder decision is made, a foreground-service recording mode is proposed, or the WebView capture floor changes.

## Context

Eighty-four of the approved 87 tools are enabled; Audio Recorder (#111) and Video to GIF (#112) remain behind their tier-4 release reviews (#34, #35), and the plan reserves `RECORD_AUDIO` for exactly this gate. Capacitor's `BridgeWebChromeClient` maps a WebView `AUDIO_CAPTURE` request to runtime requests for `RECORD_AUDIO` and `MODIFY_AUDIO_SETTINGS`, and never requests `CAMERA` for audio-only capture. Both permissions must appear in the merged manifest for the runtime dialog to work, and `scripts/check-android-manifest.mjs` currently rejects them.

## Decision (proposed)

Approve Audio Recorder for implementation with:

- `RECORD_AUDIO` (dangerous, runtime) and `MODIFY_AUDIO_SETTINGS` (normal) added to the merged manifest and the manifest-check allowlist in the same reviewed change, with the permission budget in `AGENT.md`/`CLAUDE.md` section 15 updated.
- A narrow `MicrophoneRecorderService` platform contract; tools never touch `getUserMedia`/`MediaRecorder` directly.
- Foreground-only capture that finalizes on lifecycle inactive; no foreground service, no background recording, no exact alarms.
- Recording of `audio/webm;codecs=opus` with honest format labeling and an optional tested WAV export; sensitive-session data handling with no persistence and Save As-only export.
- Hard limits: 10 minutes and 32 MiB per take, finalized (not errored) at the limit.

## Alternatives considered

- A custom native `AudioRecord` plugin (larger native surface, better interruption control) — rejected for version 1.
- WAV-only capture via `AudioWorklet` PCM — rejected as a larger, riskier pipeline for no policy gain.
- Deferring the tool — conflicts with ADR 0004's all-87 first-release scope and requires a separate scope decision.

## Consequences

- The first `RECORD_AUDIO` grant changes the app's privacy surface: the Play Data Safety declaration and privacy policy must disclose on-device-only microphone processing before any build with the permission ships.
- On-device evidence (denial/revocation, interruptions, backgrounding, mic indicator release, low-storage export) remains the binding gate for closing #111; browser-only success is not completion.
- If the product owner declines, the all-87 scope decision in ADR 0004 must be deliberately revisited rather than silently deferred.
