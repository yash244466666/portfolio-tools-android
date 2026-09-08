# Release Review: Audio Recorder

- Review issue: #34 (tool issue: #111)
- Status: **DRAFT — the approval decision belongs to the product owner and is not made by this document**
- Date: 2026-09-08
- Upstream reference: `portfolio-v2` commit `61e54c64edbeffc9487239b6dae399e255c6a71d`, `components/tools/media/audio-recorder.tsx` (198 lines)
- Scope of this document: technical evidence and a proposed design so the tier-4 gate in `ANDROID_APP_IMPLEMENTATION_PLAN.md` ("Audio Recorder and Video to GIF experiments" and the `RECORD_AUDIO` permission decision) can be decided deliberately. Implementation work on #111 must not start before the decision is recorded.

## 1. Upstream implementation and its defects

The upstream tool records via `navigator.mediaDevices.getUserMedia({ audio: true })` and `MediaRecorder`, accumulates `Blob` chunks, plays the result through a detached `Audio` element, and downloads it through a hidden `<a download>` anchor.

Defects that the Android product must not copy (against repository rules):

| Upstream behavior                                                                                                                             | Repository rule violated                                                       | Required fix                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hidden `<a download>` anchor for export                                                                                                       | Section 11: no hidden download anchors; export goes through platform contracts | Use the FileService Save As bridge                                                                                                                 |
| Advertises "WebM" in the result card while the plan records the product promise as WAV (`ANDROID_APP_IMPLEMENTATION_PLAN.md` lines 187, 1505) | Section 26: honest wording                                                     | Label the actual recorded format, or offer a real, tested export conversion                                                                        |
| Decorative 40-bar "waveform" filled from `Math.random()` at mount; bars never reflect recorded audio and differ on every render               | Section 16: status cannot be misleading; section 17: non-visual equivalents    | Either a real `AnalyserNode`-driven visualization with an `aria-hidden` decoration role and a text status, or an honest static recording indicator |
| Single `catch` maps every failure (denied, no microphone, unsupported encoder, insecure origin) to "Microphone access denied"                 | Section 16: distinct denied/unsupported/error states                           | Distinguish permission-denied, permission-dismissed, no-device, and unsupported states                                                             |
| Duration counted by `setInterval` ticks                                                                                                       | ADR 0014 class of bug: throttled background timers lose time                   | Derive duration from wall-clock anchors                                                                                                            |
| Recording blob and object URL survive in memory after navigation; `Audio` element never released                                              | Section 5/plan 1848: release streams, object URLs, and contexts on unmount     | Stop tracks and revoke URLs on every path                                                                                                          |
| No duration or size bound                                                                                                                     | Section 13: every format records limits                                        | Hard limits below                                                                                                                                  |
| Recording proceeds if the app is backgrounded (no lifecycle handling)                                                                         | Plan 775: foreground-only first release                                        | Stop and finalize on lifecycle inactive                                                                                                            |

## 2. Platform capability evidence (verified in this repository's dependency tree)

- **Permission mapping**: `node_modules/@capacitor/android/capacitor/src/main/java/com/getcapacitor/BridgeWebChromeClient.java` (`onPermissionRequest`, lines 102–122): a WebView request for `android.webkit.resource.AUDIO_CAPTURE` is forwarded to the Android runtime permission dialog for `RECORD_AUDIO` **and** `MODIFY_AUDIO_SETTINGS`; `VIDEO_CAPTURE` (which would pull in `CAMERA`) is only requested when the page asks for video. An audio-only `getUserMedia({ audio: true })` therefore never triggers a `CAMERA` request.
- **Both permissions must be present in the merged manifest** for the runtime dialog to appear. `RECORD_AUDIO` is a dangerous (runtime) permission; `MODIFY_AUDIO_SETTINGS` is a normal (install-time) permission.
- **Manifest policy**: `scripts/check-android-manifest.mjs` currently rejects both permissions; the allowlist may only be extended in the same reviewed change as the implementation, after the decision below, with the ADR updated.
- **Secure origin**: WebView only grants `getUserMedia` on a secure origin. The production bundled origin `https://app.yash.tools` and the local development origins satisfy this.
- **Encoder support**: Android WebView supports `MediaRecorder` with `audio/webm;codecs=opus` on the current baseline (the repository's emulator WebView is 124.0.6367.219, far above the introduction versions). The implementation must probe `MediaRecorder.isTypeSupported` and surface a distinct unsupported state; no fallback codec is proposed.
- **Capacitor config**: `android.captureInput` is unrelated (it only changes the keyboard input connection, per `CapacitorWebView.java` lines 38–45 and `CapConfig.java` line 284). No Capacitor setting is required for audio capture; the bridge behavior above is unconditional.

## 3. Proposed design (for approval)

**Contract.** A narrow `MicrophoneRecorderService` in `src/platform/contracts.ts`, consumed through `usePlatform()` like every other service. Tools never call `getUserMedia`/`MediaRecorder` directly, mirroring the ClipboardService pattern:

```ts
export interface RecordingStartOptions {
  /** Hard stop and finalize at this duration; the tool may pass a smaller value. */
  maximumDurationMs: number
  /** Hard stop and finalize at this accumulated size. */
  maximumBytes: number
}

export type RecordingState = "idle" | "requesting-permission" | "recording" | "finalizing"

export interface MicrophoneRecorderService {
  /** Resolves the moment capture starts; rejects with typed platform errors. */
  start(options: RecordingStartOptions, onLevel?: (level: number) => void): Promise<void>
  /** Finalizes and resolves with the bounded recording result. */
  stop(): Promise<RecordingResult>
  /** Cancels; the partial recording is discarded and tracks are stopped. */
  cancel(): Promise<void>
}
```

- Typed errors keep the existing `PlatformError` model: `MICROPHONE_PERMISSION_DENIED`, `MICROPHONE_PERMISSION_DISMISSED`, `MICROPHONE_UNAVAILABLE`, `MICROPHONE_UNSUPPORTED`, `RECORDING_LIMIT_REACHED` (finalizes, does not error), plus the standard cancellation shape.
- The web adapter uses the same web APIs so behavior and tests stay shared; it fails with `MICROPHONE_PERMISSION_DENIED` where the Permissions API reports denial, and `MICROPHONE_UNSUPPORTED` where `getUserMedia` is absent.
- The Capacitor adapter relies on the WebView bridge evidence in section 2 and adds a lifecycle subscription: on `inactive`, it finalizes the recording (never silently drops it), so the microphone is released before the Activity leaves the foreground. This is defense in depth; whether WebView independently pauses capture on pause is a device-verification item.

**Limits (initial, matching plan-level conservatism):**

- Maximum recording duration: 10 minutes, hard-stopped and finalized.
- Maximum size: 32 MiB, hard-stopped and finalized (`RECORDING_LIMIT_REACHED` signals which limit ended the take).
- Maximum memory: the take accumulates in recorder chunks and is finalized to a single `Blob`; no base64 bridge transfer, no persistence anywhere except an explicit user export.

**Output format.** Record `audio/webm;codecs=opus` (the WebView-native encoding) and label it honestly everywhere. Optionally, in the same implementation, offer a bounded WAV (PCM 16-bit) export produced by a pure, unit-tested encoder from decoded audio; the tool module and store listing must name both formats precisely. The alternative — recording WAV directly — is not possible with `MediaRecorder` and would require full manual PCM capture via `AudioWorklet`, which is a larger, riskier surface.

**Privacy and data classification.**

- Recordings are _sensitive session_ data: never persisted, never logged, never included in crash/error text; cleared on navigation and process death by definition (memory only).
- Export only through the FileService Save As bridge, sharing the same final bytes as the preview, with a sanitized suggested filename.
- Play Data Safety: audio is processed on device and never transmitted, so nothing is "collected" or shared; the privacy policy must disclose microphone access and on-device-only processing.
- Android's own privacy chip (mic indicator) is system behavior; the tool must not suppress or misrepresent it.

**Accessibility and states.** 48 dp controls, distinct visible states for initial/recording/finalized/denied/dismissed/unsupported/limit-reached/reset, a text status that does not rely on color or the visualization alone, and a `role="status"` live region for recording transitions.

## 4. Decision points requiring product-owner approval

1. **Permission budget**: add `RECORD_AUDIO` (dangerous, runtime) and `MODIFY_AUDIO_SETTINGS` (normal) to the merged manifest and the manifest-check allowlist. This is the single irreversible-feeling step; the plan reserves `RECORD_AUDIO` for exactly this gate (plan line 769).
2. **Foreground-only confirmation**: confirm no foreground-service recording is planned for version 1 (background recording requires a `microphone` foreground-service type and a much heavier policy review, plan line 775).
3. **Format promise**: approve the WebM/Opus recording format plus optional WAV export, superseding the stale WAV claim in the upstream-derived plan rows (lines 187, 1505).
4. **Proceed or defer**: ADR 0004 requires all 87 tools in the first release, so a decision to defer Audio Recorder indefinitely would require reopening the release-scope ADR.

## 5. Device evidence still required after approval (blocks #111 closure)

The following can only be produced on a physical device with a real microphone and are recorded here as the implementation's exit criteria, matching issue #34's acceptance list:

- Permission denial, dismissal, and post-hoc revocation mid-session recovery states.
- Interruptions: incoming call, audio-route change, another app taking the microphone, backgrounding mid-take — each must stop or finalize safely and release the mic indicator.
- Confirmation that no capture continues after the Activity pauses (logcat-less verification via the system mic indicator).
- Duration/size limit hard stops on device, low-memory behavior during a maximum-length take, and low-storage Save As failure recovery.
- WebView-version variance check (the emulator's 124.0.6367.219 is the current floor).

## 6. Alternatives considered

- **Custom native `AudioRecord` plugin**: gives precise interruption/audio-focus control and filesystem-independent output, but adds a new native surface, its own review burden, and contradicts the repository preference for narrow bridges only where the web platform cannot deliver. Rejected for version 1; revisitable if device evidence shows WebView capture behavior is inadequate.
- **WAV-only via AudioWorklet PCM capture**: removes format ambiguity but replaces `MediaRecorder` with a hand-rolled capture pipeline (higher CPU/memory risk, more code to review) for no policy gain.
- **Defer the tool**: conflicts with ADR 0004's all-87 scope; would require a deliberate scope change instead of silent omission.

## 7. Conclusion

Audio Recorder is implementable within the existing architecture: WebView + Capacitor's built-in permission bridge covers the capability, the design adds one narrow contract, no new dependencies, and no background capture. The only gating decisions are the permission-budget expansion and the format promise, both reserved to the product owner. Device evidence in section 5 remains the binding verification for #111 regardless of this document's technical conclusions.
