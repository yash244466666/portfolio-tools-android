import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { CopyButton } from "@/components/ui/CopyButton"
import { Field } from "@/components/ui/Field"
import { ToolPanel } from "@/components/ui/ToolPanel"
import { usePlatform } from "@/platform/platform-context"
import { toSafeErrorMessage } from "@/platform/errors"
import {
  countWords,
  decodeNoteContent,
  isValidNoteSize,
  maximumNoteBytes,
  migrateNote,
  noteFileName,
  noteMimeType,
  notesStorageKey,
  serializeNote,
} from "./notes"

const saveDebounceMs = 500
const confirmResetMs = 3000

export default function NotesScratchpad() {
  const { preferences, files } = usePlatform()
  const [text, setText] = useState("")
  const [loaded, setLoaded] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [status, setStatus] = useState("")
  const [busy, setBusy] = useState(false)
  const [clearArmed, setClearArmed] = useState(false)
  const [importArmed, setImportArmed] = useState(false)
  const persistedTextRef = useRef("")
  const latestTextRef = useRef("")
  const loadedRef = useRef(false)
  const blockedRef = useRef(false)
  const pendingSaveRef = useRef<number | null>(null)
  const inFlightWritesRef = useRef<Set<Promise<void>>>(new Set())
  const clearingRef = useRef(false)

  useEffect(() => {
    latestTextRef.current = text
  }, [text])

  useEffect(() => {
    loadedRef.current = loaded
  }, [loaded])

  useEffect(() => {
    blockedRef.current = blocked || loadFailed
  }, [blocked, loadFailed])

  // Load the durable note once. Autosaving is blocked until the load settles so a slow
  // store can never be overwritten with the empty initial state.
  useEffect(() => {
    let cancelled = false
    void preferences
      .get<unknown>(notesStorageKey)
      .then((raw) => {
        if (cancelled) return
        const migrated = migrateNote(raw)
        if (migrated.status === "ok") {
          setText(migrated.note.text)
          persistedTextRef.current = migrated.note.text
          setSavedAt(new Date(migrated.note.updatedAt))
        } else if (migrated.status === "newer-schema") {
          setBlocked(true)
        }
        setLoaded(true)
      })
      .catch(() => {
        if (cancelled) return
        // Never start an empty autosave over a note we could not read.
        setLoadFailed(true)
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [preferences])

  // Autosave the note after typing settles. Oversized content is refused so the durable
  // copy always satisfies the documented bound.
  useEffect(() => {
    if (!loaded || blocked || loadFailed) return
    if (text === persistedTextRef.current) return
    if (!isValidNoteSize(text)) return
    const timeout = window.setTimeout(() => {
      pendingSaveRef.current = null
      const write = preferences.set(notesStorageKey, serializeNote(text, new Date()))
      inFlightWritesRef.current.add(write)
      const settle = () => inFlightWritesRef.current.delete(write)
      void write.then(
        () => {
          settle()
          if (clearingRef.current) return
          persistedTextRef.current = text
          setSavedAt(new Date())
        },
        (error: unknown) => {
          settle()
          if (clearingRef.current) return
          setStatus(
            `Autosave failed. ${toSafeErrorMessage(error)} Your latest text is still open here.`,
          )
        },
      )
    }, saveDebounceMs)
    pendingSaveRef.current = timeout
    return () => {
      window.clearTimeout(timeout)
      if (pendingSaveRef.current === timeout) pendingSaveRef.current = null
    }
  }, [text, loaded, blocked, loadFailed, preferences])

  // Flush the settled edit window when the screen unmounts (route change, Back). Without
  // this the last <500 ms of typing would be cleared with the debounce timer and lost.
  useEffect(() => {
    return () => {
      if (!loadedRef.current || blockedRef.current) return
      const pendingText = latestTextRef.current
      if (pendingText === persistedTextRef.current) return
      if (!isValidNoteSize(pendingText)) return
      void preferences
        .set(notesStorageKey, serializeNote(pendingText, new Date()))
        .catch(() => undefined)
    }
  }, [preferences])

  useEffect(() => {
    if (!clearArmed && !importArmed) return
    const timeout = window.setTimeout(() => {
      setClearArmed(false)
      setImportArmed(false)
    }, confirmResetMs)
    return () => window.clearTimeout(timeout)
  }, [clearArmed, importArmed])

  async function exportNote(action: "share" | "save") {
    if (!text || busy) return
    setBusy(true)
    try {
      const file = {
        name: noteFileName,
        mimeType: noteMimeType,
        data: text,
        encoding: "utf8",
      } as const
      if (action === "share") {
        await files.share(file)
        setStatus("Note shared.")
      } else {
        await files.saveAs(file)
        setStatus("Note saved.")
      }
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function importNote() {
    if (busy) return
    setBusy(true)
    setImportArmed(false)
    try {
      const picked = await files.pick({ accept: [noteMimeType], maximumBytes: maximumNoteBytes })
      const first = picked[0]
      if (!first) {
        setStatus("No file selected.")
        return
      }
      const content = await files.readContent(first, { maximumBytes: maximumNoteBytes })
      const imported = decodeNoteContent(content.data)
      if (!isValidNoteSize(imported)) {
        setStatus("The selected file is too large for the scratchpad. Import was cancelled.")
        return
      }
      setText(imported)
      setStatus(`Imported ${imported.length} characters.`)
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function clearNote() {
    if (!clearArmed) {
      setClearArmed(true)
      return
    }
    setClearArmed(false)
    // A debounce timer or an in-flight write must not resurrect the note after the
    // explicit clear. Cancel the timer, let any dispatched write settle, then remove.
    clearingRef.current = true
    if (pendingSaveRef.current !== null) {
      window.clearTimeout(pendingSaveRef.current)
      pendingSaveRef.current = null
    }
    try {
      if (inFlightWritesRef.current.size > 0) {
        await Promise.allSettled([...inFlightWritesRef.current])
      }
      await preferences.remove(notesStorageKey)
      persistedTextRef.current = ""
      setText("")
      setSavedAt(null)
      setStatus("Note cleared from this device.")
    } catch (error) {
      setStatus(toSafeErrorMessage(error))
    } finally {
      clearingRef.current = false
    }
  }

  const words = countWords(text)
  const overLimit = !isValidNoteSize(text)
  const unavailable = blocked || loadFailed

  return (
    <div className="grid gap-4">
      <ToolPanel>
        <div className="grid gap-4">
          <Field
            error={
              unavailable
                ? undefined
                : overLimit
                  ? `The note exceeds the ${Math.round(maximumNoteBytes / 1024)} KiB limit. Shorten it to save.`
                  : undefined
            }
            hint="Plain text, stored unencrypted in app-private storage on this device — never uploaded, never backed up. Removing the app or using Clear storage deletes it."
            htmlFor="note-text"
            label="Scratchpad"
          >
            <textarea
              aria-describedby={overLimit ? "note-text-error" : "note-text-hint"}
              className="app-input min-h-72 resize-y"
              disabled={unavailable || !loaded}
              id="note-text"
              onChange={(event) => setText(event.target.value)}
              placeholder="Start typing your note… it saves to this device automatically."
              value={text}
            />
          </Field>
          <p className="text-sm text-[var(--text-secondary)]">
            {words} {words === 1 ? "word" : "words"} · {text.length}{" "}
            {text.length === 1 ? "character" : "characters"}
            {savedAt ? (
              <span className="motion-pop" key={savedAt.getTime()}>
                {" "}
                · Last saved {savedAt.toLocaleTimeString()}
              </span>
            ) : null}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CopyButton label="Copy note" onStatus={setStatus} value={text} />
            <Button
              disabled={!text || busy}
              onClick={() => void exportNote("share")}
              variant="secondary"
            >
              Share note
            </Button>
            <Button
              disabled={!text || busy}
              onClick={() => void exportNote("save")}
              variant="secondary"
            >
              Save note
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              disabled={unavailable || busy}
              onClick={() => (importArmed ? void importNote() : setImportArmed(true))}
              variant="secondary"
            >
              {importArmed ? "Tap again to replace the note" : "Import text file"}
            </Button>
            <Button
              disabled={unavailable || (!text && !clearArmed)}
              onClick={() => void clearNote()}
              variant={clearArmed ? "danger" : "quiet"}
            >
              {clearArmed ? "Tap again to confirm" : "Clear note"}
            </Button>
          </div>
          {status ? (
            <p aria-live="polite" className="text-sm text-[var(--text-secondary)]" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </ToolPanel>

      {unavailable ? (
        <ToolPanel title="Saved note unavailable">
          <p className="text-sm" role="alert">
            {blocked
              ? "The saved note was written by a newer app version and cannot be opened here. It is kept on this device untouched."
              : "The saved note could not be read, so editing is disabled to avoid overwriting it. It has not been changed; reopen this screen to try again."}
          </p>
        </ToolPanel>
      ) : null}
    </div>
  )
}
