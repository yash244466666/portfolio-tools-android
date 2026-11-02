package dev.yash.tools;

/**
 * Pure policy helpers for the app-owned network diagnostics bridge. Keeping
 * the bounds here makes them unit-testable without an Android runtime and keeps
 * the plugin itself a thin adapter over ConnectivityManager/TrafficStats.
 */
final class NetworkDiagnosticsPolicy {

    static final int CONTRACT_VERSION = 1;
    static final int MAX_ADDRESSES = 8;
    static final int MAX_ADDRESS_LENGTH = 128;
    static final long UNSUPPORTED_COUNTER = -1L;

    private NetworkDiagnosticsPolicy() {}

    /** Link estimates are only meaningful when positive; zero/negative is unknown. */
    static Integer positiveOrNull(int value) {
        return value > 0 ? Integer.valueOf(value) : null;
    }

    /** Platform signal is unknown when -1 (API convention) or outside a sane range. */
    static Integer signalOrNull(int value) {
        return value != -1 && value >= -200 && value <= 200 ? Integer.valueOf(value) : null;
    }

    static boolean countersSupported(long rxBytes, long txBytes) {
        return (
            rxBytes != UNSUPPORTED_COUNTER &&
            txBytes != UNSUPPORTED_COUNTER &&
            rxBytes >= 0 &&
            txBytes >= 0
        );
    }

    /**
     * Returns a display-safe address or null. Control characters (C0, DEL, C1)
     * and line/paragraph separators are removed, and the value is capped so a
     * hostile or defective platform value cannot reach the UI unbounded.
     */
    static String boundedAddress(String raw) {
        if (raw == null) return null;
        StringBuilder builder = new StringBuilder(Math.min(raw.length(), MAX_ADDRESS_LENGTH));
        for (int index = 0; index < raw.length() && builder.length() < MAX_ADDRESS_LENGTH; index += 1) {
            char value = raw.charAt(index);
            boolean control =
                value < 0x20 ||
                value == 0x7f ||
                (value >= 0x80 && value <= 0x9f) ||
                value == 0x061c ||
                value == 0x200e ||
                value == 0x200f ||
                (value >= 0x202a && value <= 0x202e) ||
                value == 0x2028 ||
                value == 0x2029 ||
                (value >= 0x2066 && value <= 0x2069);
            if (!control && !Character.isISOControl(value)) builder.append(value);
        }
        String trimmed = builder.toString().trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
