# Export/import/Save As/sharing interoperability evidence (automated portions)

> Compiled: 2026-09-08 for issue #26. System picker/Share-target
> interoperability against real documents providers and receivers requires
> the physical-device matrix and remains open there.

## Format contract coverage

Every file-producing tool records extension, MIME type, encoding,
filename policy, output limits, and interoperability behavior, enforced by
tests and the platform contracts:

| Tool                                                    | Output formats                           | Automated oracle                                                                          |
| ------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------- |
| Image Compressor                                        | PNG/JPEG/WebP re-encode                  | Decoded-pixel caps, EXIF-orientation normalization, metadata stripping, component vectors |
| PDF Converter                                           | PDF (pdf-lib), PDF text/images via pdfjs | Byte/page/decoded-memory limits, encryption detection, bundled worker, fixtures           |
| Audio Recorder                                          | WAV at the real AudioContext sample rate | Header/rate vectors, bounded duration, component coverage                                 |
| Video to GIF                                            | GIF (LZW encoder)                        | Independent parser/decoder oracle with byte-exact vectors (batch 13)                      |
| QR Generator                                            | PNG canvas export                        | Render-plan vectors, canvas backing-store dimension check (E2E)                           |
| JSON/YAML/XML/CSV/Markdown/iCalendar/vCard/Notes export | Text encodings                           | Pure standard vectors + component tests + fixtures                                        |

## SAF / Save As / share byte equality

- The Android instrumentation suite (API 35 emulator, Espresso Intents +
  synthetic provider) covers: scoped `ACTION_OPEN_DOCUMENT` picking with
  validated `content://` metadata, `ACTION_CREATE_DOCUMENT` Save As with the
  bounded private-cache handoff, **exact-byte write equality between
  previewed and saved/shared output**, share-intent inspection, read-only
  URI grants limited to `cache/share/`, cancellation and cleanup, and lazy
  receiver reads.
- Native policy tests cover operation-ID/MIME/URI validation, size caps,
  filename sanitization, concurrency, and interrupted calls.
- Canonical MIME/extension mappings are exercised by the MIME Type Lookup
  tool's table and the file-service contract tests.

## Pending physical-device rows (keep #26 open)

- Real cloud/local/OEM documents-provider behavior (R-003), real share
  targets with delayed lazy reads (R-005), and receiver behavior on OEM
  Android versions.
