package dev.yash.tools;

import java.nio.charset.StandardCharsets;

final class ClipboardPolicy {

    static final int CONTRACT_VERSION = 1;
    static final long MAX_WRITE_BYTES = 1024L * 1024L;
    static final int SENSITIVE_CLIPBOARD_MIN_SDK = 33;

    private ClipboardPolicy() {}

    /**
     * Validates a versioned clipboard write request. Returns the normalized request or null when
     * the caller must reject the call. Empty values are valid because the timed-clear path writes
     * them; values are never logged, echoed, or stored beyond the system clipboard.
     */
    static WriteRequest validateWrite(Object contractVersion, String value, Object sensitive) {
        if (
            !(contractVersion instanceof Number) ||
            ((Number) contractVersion).doubleValue() != CONTRACT_VERSION ||
            value == null ||
            value.getBytes(StandardCharsets.UTF_8).length > MAX_WRITE_BYTES ||
            !(sensitive instanceof Boolean)
        ) {
            return null;
        }
        return new WriteRequest(value, (Boolean) sensitive);
    }

    /**
     * Android 13 added the sensitive clipboard extra that suppresses system clipboard previews.
     * Older versions degrade to a normal write because no equivalent metadata exists.
     */
    static boolean markSensitive(int sdkInt) {
        return sdkInt >= SENSITIVE_CLIPBOARD_MIN_SDK;
    }

    static final class WriteRequest {

        final String value;
        final boolean sensitive;

        private WriteRequest(String value, boolean sensitive) {
            this.value = value;
            this.sensitive = sensitive;
        }
    }
}