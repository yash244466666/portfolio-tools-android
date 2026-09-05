export type PlatformErrorCode =
  | "CLIPBOARD_READ_FAILED"
  | "CLIPBOARD_WRITE_FAILED"
  | "DATA_READ_FAILED"
  | "DATA_WRITE_FAILED"
  | "FILE_PICK_CANCELLED"
  | "FILE_PICK_UNAVAILABLE"
  | "FILE_TOO_LARGE"
  | "FILE_SHARE_FAILED"
  | "FILE_SAVE_UNAVAILABLE"
  | "NOTIFICATION_DENIED"
  | "NOTIFICATION_SCHEDULE_FAILED"
  | "EXTERNAL_URL_REJECTED"
  | "EXTERNAL_URL_OPEN_FAILED"
  | "RANDOM_UNAVAILABLE"

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
