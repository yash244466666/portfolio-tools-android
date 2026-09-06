package dev.yash.tools;

import java.io.IOException;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Pure policy and streaming logic for reading picked content URIs. Hashing streams in bounded
 * chunks and never loads a whole file into memory; the bounded read is capped before any byte is
 * buffered. URIs are validated by scheme here and must additionally be a URI the picker returned
 * in this process, which the plugin enforces through the picked-URI registry. No Android classes
 * are referenced so the stream behavior is unit-testable with real correctness vectors.
 */
final class ContentReadPolicy {

    static final long MAX_READ_BYTES = 16L * 1024L * 1024L;
    static final long MAX_HASH_BYTES = 1024L * 1024L * 1024L;
    static final int STREAM_CHUNK_BYTES = 64 * 1024;
    static final Set<String> SUPPORTED_DIGEST_ALGORITHMS =
        Collections.unmodifiableSet(new HashSet<>(Arrays.asList("SHA-1", "SHA-256", "SHA-512")));

    private static final Map<String, String> CONTRACT_ALGORITHMS = createContractAlgorithms();

    private static Map<String, String> createContractAlgorithms() {
        Map<String, String> mapping = new HashMap<>();
        mapping.put("sha-1", "SHA-1");
        mapping.put("sha-256", "SHA-256");
        mapping.put("sha-512", "SHA-512");
        return Collections.unmodifiableMap(mapping);
    }

    private ContentReadPolicy() {}

    /** Maps a contract algorithm name to its JCA MessageDigest name, or null when unsupported. */
    static String digestAlgorithm(String requested) {
        if (requested == null) {
            return null;
        }
        return CONTRACT_ALGORITHMS.get(requested.toLowerCase(Locale.ROOT));
    }

    static boolean isValidContentUri(String uri) {
        return uri != null && uri.startsWith("content://");
    }

    static long validateReadMaximum(Long requested) {
        long limit = requested == null ? MAX_READ_BYTES : requested;
        if (limit <= 0 || limit > MAX_READ_BYTES) {
            throw new IllegalArgumentException("Invalid read size limit.");
        }
        return limit;
    }

    /**
     * Streams the input into the digest without buffering the content. Enforces the byte cap and
     * the cancellation flag between chunks so a cancelled or oversized stream stops early.
     */
    static StreamDigest digestStream(
        InputStream input,
        MessageDigest digest,
        long maximumBytes,
        java.util.function.BooleanSupplier cancelled
    ) throws IOException, StreamSizeExceededException, StreamCancelledException {
        long total = 0;
        byte[] buffer = new byte[STREAM_CHUNK_BYTES];
        int count;
        while ((count = input.read(buffer)) != -1) {
            if (cancelled.getAsBoolean()) {
                throw new StreamCancelledException();
            }
            total += count;
            if (total > maximumBytes) {
                throw new StreamSizeExceededException();
            }
            digest.update(buffer, 0, count);
        }
        return new StreamDigest(digest.digest(), total);
    }

    /** Reads a bounded stream fully into memory; sizes above the cap are rejected, not truncated. */
    static byte[] readBounded(InputStream input, long maximumBytes)
        throws IOException, StreamSizeExceededException {
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[STREAM_CHUNK_BYTES];
        long total = 0;
        int count;
        while ((count = input.read(buffer)) != -1) {
            total += count;
            if (total > maximumBytes) {
                throw new StreamSizeExceededException();
            }
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }

    static String toHex(byte[] bytes) {
        StringBuilder result = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            result.append(String.format("%02x", value));
        }
        return result.toString();
    }

    static final class StreamDigest {

        final byte[] digest;
        final long size;

        StreamDigest(byte[] digest, long size) {
            this.digest = Arrays.copyOf(digest, digest.length);
            this.size = size;
        }
    }

    static final class StreamSizeExceededException extends Exception {}

    static final class StreamCancelledException extends Exception {}
}