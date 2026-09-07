import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlatformProvider } from "@/platform/platform-context"
import type { PlatformServices, ScheduledNotification } from "@/platform/contracts"
import type * as platformModule from "@/platform/services"
import PomodoroTimer from "@/tools/pomodoro-timer/PomodoroTimer"
import { migrateTimer, phaseDurationMs, pomodoroStorageKey, serializeTimer } from "./pomodoro"

const store = vi.hoisted(() => new Map<string, unknown>())
const requestPermissionMock = vi.hoisted(() =>
  vi.fn(() => Promise.resolve({ granted: false, canAskAgain: true })),
)
const scheduleMock = vi.hoisted(() =>
  vi.fn((notification: ScheduledNotification) => {
    void notification
    return Promise.resolve()
  }),
)
const cancelMock = vi.hoisted(() => vi.fn(() => Promise.resolve()))

vi.mock("@/platform/services", async (importOriginal) => {
  const actual = await importOriginal<typeof platformModule>()
  const base: PlatformServices = actual.platformServices
  const services: PlatformServices = {
    ...base,
    preferences: {
      get: <T,>(key: string): Promise<T | null> =>
        Promise.resolve((store.get(key) as T | undefined) ?? null),
      set: <T,>(key: string, value: T): Promise<void> => {
        store.set(key, value)
        return Promise.resolve()
      },
      remove: (key: string): Promise<void> => {
        store.delete(key)
        return Promise.resolve()
      },
      clear: (): Promise<void> => {
        store.clear()
        return Promise.resolve()
      },
    },
    notifications: {
      requestPermission: requestPermissionMock,
      schedule: scheduleMock,
      cancel: cancelMock,
    },
  }
  return { platformServices: services }
})

async function renderLoadedTool() {
  render(
    <PlatformProvider>
      <PomodoroTimer />
    </PlatformProvider>,
  )
  await act(async () => {})
}

function timerRoleText(): string {
  return screen.getByRole("timer").textContent ?? ""
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-07T10:00:00Z"))
  store.clear()
  requestPermissionMock.mockClear().mockResolvedValue({ granted: false, canAskAgain: true })
  scheduleMock.mockClear().mockResolvedValue(undefined)
  cancelMock.mockClear().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("Pomodoro timer interactions", () => {
  it("starts at the default work phase", async () => {
    await renderLoadedTool()
    expect(timerRoleText()).toBe("25:00")
    expect(screen.getByText("0 completed sessions")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Work (25 min)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
  })

  it("starts, counts down from the wall clock, and persists the running phase", async () => {
    await renderLoadedTool()
    fireEvent.click(screen.getByRole("button", { name: "Start" }))

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(timerRoleText()).toBe("24:55")
    expect(screen.getByText("Focus session running.")).toBeInTheDocument()

    const migrated = migrateTimer(store.get(pomodoroStorageKey))
    expect(migrated.status).toBe("ok")
    if (migrated.status !== "ok") return
    expect(migrated.timer.state).toBe("running")
    expect(migrated.timer.remainingMs).toBe(phaseDurationMs("work", 25, 5))
  })

  it("pauses with a frozen clock and resumes without losing time", async () => {
    await renderLoadedTool()
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    await act(async () => {
      vi.advanceTimersByTime(10_000)
    })

    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    const frozenAt = timerRoleText()
    expect(frozenAt).toBe("24:50")
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    expect(timerRoleText()).toBe(frozenAt)

    const paused = migrateTimer(store.get(pomodoroStorageKey))
    expect(paused.status).toBe("ok")
    if (paused.status !== "ok") return
    expect(paused.timer.state).toBe("paused")
    expect(paused.timer.remainingMs).toBe(25 * 60_000 - 10_000)

    fireEvent.click(screen.getByRole("button", { name: "Resume" }))
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    expect(timerRoleText()).toBe("24:45")
  })

  it("completes a phase, counts the session, and runs into the next phase", async () => {
    await renderLoadedTool()
    fireEvent.change(screen.getByLabelText("Work duration (minutes)"), { target: { value: "1" } })
    fireEvent.click(screen.getByRole("button", { name: "Start" }))

    await act(async () => {
      vi.advanceTimersByTime(60_500)
    })

    expect(screen.getByText("Break time")).toBeInTheDocument()
    expect(screen.getByText("1 completed session")).toBeInTheDocument()
    expect(screen.getByText("Work session complete. Take a break.")).toBeInTheDocument()
    expect(timerRoleText()).toBe("05:00")

    const migrated = migrateTimer(store.get(pomodoroStorageKey))
    expect(migrated.status).toBe("ok")
    if (migrated.status !== "ok") return
    expect(migrated.timer.mode).toBe("break")
    expect(migrated.timer.state).toBe("running")
    expect(migrated.timer.sessions).toBe(1)
  })

  it("resets to an idle work phase", async () => {
    await renderLoadedTool()
    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    fireEvent.click(screen.getByRole("button", { name: "Reset" }))

    expect(timerRoleText()).toBe("25:00")
    expect(screen.getByText("Timer reset.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument()
  })

  it("keeps permission denied out of the alerts toggle", async () => {
    await renderLoadedTool()
    fireEvent.click(screen.getByRole("button", { name: "Alert me at phase end" }))
    await act(async () => {})

    expect(screen.getByText(/Notification permission was declined/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alert me at phase end" })).toHaveAttribute(
      "aria-pressed",
      "false",
    )
    expect(requestPermissionMock).toHaveBeenCalledTimes(1)
  })

  it("schedules and cancels the phase alert when granted", async () => {
    requestPermissionMock.mockResolvedValue({ granted: true, canAskAgain: false })
    await renderLoadedTool()
    fireEvent.click(screen.getByRole("button", { name: "Alert me at phase end" }))
    await act(async () => {})

    expect(screen.getByRole("button", { name: "Alerts on" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )

    fireEvent.click(screen.getByRole("button", { name: "Start" }))
    await act(async () => {})
    expect(scheduleMock).toHaveBeenCalledTimes(1)
    const scheduled = scheduleMock.mock.calls[0]?.[0]
    expect(scheduled?.id).toBe("pomodoro-phase")
    expect(scheduled?.channelId).toBe("timers")
    expect(scheduled?.at.getTime()).toBe(Date.now() + phaseDurationMs("work", 25, 5))

    fireEvent.click(screen.getByRole("button", { name: "Pause" }))
    await act(async () => {})
    expect(cancelMock).toHaveBeenCalledWith("pomodoro-phase")
  })

  it("reconstructs a phase that expired while the process was away", async () => {
    const now = Date.now()
    store.set(
      pomodoroStorageKey,
      serializeTimer(
        {
          mode: "work",
          state: "running",
          workMinutes: 25,
          breakMinutes: 5,
          sessions: 3,
          notifyEnabled: false,
          startedAtMs: now - 70_000,
          remainingMs: 60_000,
        },
        new Date(now),
      ),
    )
    await renderLoadedTool()

    expect(screen.getByText("Break time")).toBeInTheDocument()
    expect(screen.getByText("4 completed sessions")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument()
    expect(timerRoleText()).toBe("05:00")
  })

  it("keeps an in-progress running phase accurate after reconstruction", async () => {
    const now = Date.now()
    store.set(
      pomodoroStorageKey,
      serializeTimer(
        {
          mode: "work",
          state: "running",
          workMinutes: 25,
          breakMinutes: 5,
          sessions: 0,
          notifyEnabled: false,
          startedAtMs: now - 30_000,
          remainingMs: 25 * 60_000,
        },
        new Date(now),
      ),
    )
    await renderLoadedTool()

    expect(screen.getByText("Focus time")).toBeInTheDocument()
    expect(timerRoleText()).toBe("24:30")
  })
})
