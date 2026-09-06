package dev.yash.tools;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

final class DocumentFilePolicy {

    static final int CONTRACT_VERSION = 1;
    static final int MAX_ACCEPT_TYPES = 32;
    static final int MAX_PICKED_DOCUMENTS = 20;
    static final long DEFAULT_MAX_PICK_BYTES = 50L * 1024L * 1024L;
    static final long MAX_PICK_BYTES = 100L * 1024L * 1024L;
    static final long MAX_SAVE_BYTES = 5L * 1024L * 1024L;
    static final String SAVE_OUTPUT_MODE = "wt";

    private static final int MAX_FILE_NAME_BYTES = 120;
    private static final String FALLBACK_FILE_NAME = "yash-tools-output";
    private static final Pattern MIME_TOKEN = Pattern.compile("[a-z0-9][a-z0-9!#$&^_.+-]*", Pattern.CASE_INSENSITIVE);

    private DocumentFilePolicy() {}

    static boolean isValidOperationId(String value) {
        if (value == null || value.length() != 36 || !value.equals(value.toLowerCase(Locale.ROOT))) {
            return false;
        }
        try {
            UUID parsed = UUID.fromString(value);
            return parsed.version() == 4 && parsed.toString().equals(value);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
    }
    static boolean isValidMimeType(String value, boolean allowWildcard) {
        if (value == null || value.length() > 127 || !value.equals(value.trim()) || !value.equals(value.toLowerCase(Locale.ROOT))) {
            return false;
        }
        int slash = value.indexOf('/');
        if (slash <= 0 || slash != value.lastIndexOf('/') || slash == value.length() - 1) {
            return false;
        }
        String type = value.substring(0, slash);
        String subtype = value.substring(slash + 1);
        if ("*".equals(type) || "*".equals(subtype)) {
            return allowWildcard && "*".equals(subtype) && ("*".equals(type) || MIME_TOKEN.matcher(type).matches());
        }
        return MIME_TOKEN.matcher(type).matches() && MIME_TOKEN.matcher(subtype).matches();
    }

    static boolean mimeTypeMatches(String accepted, String actual) {
        if (!isValidMimeType(accepted, true) || !isValidMimeType(actual, false)) {
            return false;
        }
        if ("*/*".equals(accepted) || accepted.equals(actual)) {
            return true;
        }
        int slash = accepted.indexOf('/');
        return accepted.endsWith("/*") && actual.startsWith(accepted.substring(0, slash + 1));
    }

    static long validateMaximumPickBytes(Long requested) {
        long limit = requested == null ? DEFAULT_MAX_PICK_BYTES : requested;
        if (limit <= 0 || limit > MAX_PICK_BYTES) {
            throw new IllegalArgumentException("Invalid maximum document size.");
        }
        return limit;
    }

    static String sanitizeFileName(String value) {
        if (value == null) {
            return FALLBACK_FILE_NAME;
        }
        String normalized = Normalizer.normalize(value, Normalizer.Form.NFC);
        StringBuilder result = new StringBuilder();
        boolean previousReplacement = false;
        for (int offset = 0; offset < normalized.length();) {
            int codePoint = normalized.codePointAt(offset);
            offset += Character.charCount(codePoint);
            boolean unsafe =
                codePoint < 32 ||
                codePoint == 127 ||
                codePoint == '/' ||
                codePoint == '\\' ||
                codePoint == '<' ||
                codePoint == '>' ||
                codePoint == ':' ||
                codePoint == '"' ||
                codePoint == '|' ||
                codePoint == '?' ||
                codePoint == '*';
            if (unsafe) {
                if (!previousReplacement) {
                    result.append('-');
                    previousReplacement = true;
                }
            } else {
                result.appendCodePoint(codePoint);
                previousReplacement = false;
            }
        }

        String sanitized = result.toString().replaceAll("-+", "-").replaceAll("\\s+", " ").trim();
        sanitized = sanitized.replaceAll("^\\.+|\\.+$", "");
        if (sanitized.isEmpty()) {
            return FALLBACK_FILE_NAME;
        }

        int bytes = 0;
        int end = 0;
        for (int offset = 0; offset < sanitized.length();) {
            int codePoint = sanitized.codePointAt(offset);
            int nextOffset = offset + Character.charCount(codePoint);
            int codePointBytes = sanitized.substring(offset, nextOffset).getBytes(StandardCharsets.UTF_8).length;
            if (bytes + codePointBytes > MAX_FILE_NAME_BYTES) {
                break;
            }
            bytes += codePointBytes;
            end = nextOffset;
            offset = nextOffset;
        }
        sanitized = sanitized.substring(0, end).trim().replaceAll("\\.+$", "");
        return sanitized.isEmpty() ? FALLBACK_FILE_NAME : sanitized;
    }
}
