package dev.yash.tools;

/**
 * Pure loop guard for WebView renderer-termination recovery. State is process-scoped so it keeps
 * counting across Activity recreation; at most one automatic recovery is allowed per window, and
 * once it is spent the app falls back to the user-controlled native safe-mode screen instead of
 * crash-looping. No time source is read here, so decisions are testable.
 */
final class RendererRecoveryPolicy {

    static final long AUTO_RECOVERY_WINDOW_MS = 60L * 1000L;
    static final int MAX_AUTO_RECOVERIES_PER_WINDOW = 1;

    // A never-started window is represented as one that ended long before any sane clock value,
    // so the ordinary window arithmetic treats the first decision as fresh.
    private static long windowStartMs = -AUTO_RECOVERY_WINDOW_MS;
    private static int autoRecoveriesInWindow = 0;

    private RendererRecoveryPolicy() {}

    static boolean mayAutoRecover(long nowMs) {
        if (nowMs - windowStartMs >= AUTO_RECOVERY_WINDOW_MS) {
            return true;
        }
        return autoRecoveriesInWindow < MAX_AUTO_RECOVERIES_PER_WINDOW;
    }

    static void recordAutoRecovery(long nowMs) {
        if (nowMs - windowStartMs >= AUTO_RECOVERY_WINDOW_MS) {
            windowStartMs = nowMs;
            autoRecoveriesInWindow = 1;
            return;
        }
        autoRecoveriesInWindow += 1;
    }

    static void resetForTest() {
        windowStartMs = -AUTO_RECOVERY_WINDOW_MS;
        autoRecoveriesInWindow = 0;
    }
}