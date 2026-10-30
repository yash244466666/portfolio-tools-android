export type PlatformErrorCode =
  | "CLIPBOARD_READ_FAILED"
  | "CLIPBOARD_WRITE_FAILED"
  | "CLIPBOARD_INVALID_ARGUMENT"
  | "DATA_READ_FAILED"
  | "DATA_WRITE_FAILED"
  | "FILE_PICK_CANCELLED"
  | "FILE_PICK_FAILED"
  | "FILE_PICK_UNAVAILABLE"
  | "FILE_INVALID_ARGUMENT"
  | "FILE_OPERATION_IN_PROGRESS"
  | "FILE_OPERATION_INTERRUPTED"
  | "FILE_TOO_LARGE"
  | "FILE_SHARE_CANCELLED"
  | "FILE_SHARE_FAILED"
  | "FILE_SAVE_CANCELLED"
  | "FILE_SAVE_UNAVAILABLE"
  | "FILE_SAVE_FAILED"
  | "FILE_READ_FAILED"
  | "FILE_READ_CANCELLED"
  | "NOTIFICATION_DENIED"
  | "NOTIFICATION_SCHEDULE_FAILED"
  | "EXTERNAL_URL_REJECTED"
  | "EXTERNAL_URL_OPEN_FAILED"
  | "RANDOM_UNAVAILABLE"
  | "SENSOR_INVALID_ARGUMENT"
  | "SENSOR_UNAVAILABLE"
  | "SENSOR_ALREADY_ACTIVE"
  | "SENSOR_START_FAILED"
  | "MICROPHONE_PERMISSION_DENIED"
  | "MICROPHONE_UNAVAILABLE"
  | "MICROPHONE_UNSUPPORTED"
  | "RECORDING_INVALID_ARGUMENT"
  | "RECORDING_ALREADY_ACTIVE"
  | "RECORDING_NOT_ACTIVE"
  | "RECORDING_FAILED"
  | "RECORDING_CANCELLED"

export class PlatformError extends Error {
  readonly code: PlatformErrorCode
  readonly recoverable: boolean

  constructor(code: PlatformErrorCode, message: string, recoverable = true, cause?: unknown) {
    super(message, { cause })
    this.name = "PlatformError"
    this.code = code
    this.recoverable = recoverable
  }
}

export function toSafeErrorMessage(error: unknown): string {
  if (error instanceof PlatformError) return error.message
  return "The operation could not be completed. Please try again."
}

export function isCancellationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (("name" in error && (error as { name?: unknown }).name === "AbortError") ||
      ("code" in error &&
        ((error as { code?: unknown }).code === "FILE_PICK_CANCELLED" ||
          (error as { code?: unknown }).code === "FILE_SHARE_CANCELLED" ||
          (error as { code?: unknown }).code === "FILE_SAVE_CANCELLED" ||
          (error as { code?: unknown }).code === "FILE_READ_CANCELLED" ||
          (error as { code?: unknown }).code === "RECORDING_CANCELLED")))
  )
}
