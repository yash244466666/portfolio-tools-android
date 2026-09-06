package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.Arrays;
import org.junit.Test;

public class ContentReadPolicyTest {

    @Test
    public void mapsContractAlgorithmsToJcaNames() {
        assertEquals("SHA-256", ContentReadPolicy.digestAlgorithm("sha-256"));
        assertEquals("SHA-512", ContentReadPolicy.digestAlgorithm("SHA-512"));
        assertEquals("SHA-1", ContentReadPolicy.digestAlgorithm("Sha-1"));
        assertNull(ContentReadPolicy.digestAlgorithm("md5"));
        assertNull(ContentReadPolicy.digestAlgorithm("sha-384"));
        assertNull(ContentReadPolicy.digestAlgorithm(null));
        assertNull(ContentReadPolicy.digestAlgorithm(""));
    }

    @Test
    public void validatesContentUriScheme() {
        assertTrue(ContentReadPolicy.isValidContentUri("content://docs/1"));
        assertFalse(ContentReadPolicy.isValidContentUri("file:///etc/passwd"));
        assertFalse(ContentReadPolicy.isValidContentUri("https://example.com/x"));
        assertFalse(ContentReadPolicy.isValidContentUri(null));
    }

    @Test
    public void validatesReadLimits() {
        assertEquals(ContentReadPolicy.MAX_READ_BYTES, ContentReadPolicy.validateReadMaximum(null));
        assertEquals(1024L, ContentReadPolicy.validateReadMaximum(1024L));
        assertThrows(IllegalArgumentException.class, () -> ContentReadPolicy.validateReadMaximum(0L));
        assertThrows(
            IllegalArgumentException.class,
            () -> ContentReadPolicy.validateReadMaximum(ContentReadPolicy.MAX_READ_BYTES + 1)
        );
    }

    @Test
    public void digestsEmptyStreamsToTheStandardVector() throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        ContentReadPolicy.StreamDigest result = ContentReadPolicy.digestStream(
            new ByteArrayInputStream(new byte[0]),
            digest,
            ContentReadPolicy.MAX_HASH_BYTES,
            () -> false
        );
        assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            ContentReadPolicy.toHex(result.digest));
        assertEquals(0L, result.size);
    }

    @Test
    public void digestsKnownVectorsAndReportsSizes() throws Exception {
        // SHA-256("abc") = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
        ContentReadPolicy.StreamDigest sha256 = ContentReadPolicy.digestStream(
            new ByteArrayInputStream("abc".getBytes("UTF-8")),
            MessageDigest.getInstance("SHA-256"),
            ContentReadPolicy.MAX_HASH_BYTES,
            () -> false
        );
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
            ContentReadPolicy.toHex(sha256.digest));
        assertEquals(3L, sha256.size);

        // SHA-1("abc") = a9993e364706816aba3e25717850c26c9cd0d89d
        ContentReadPolicy.StreamDigest sha1 = ContentReadPolicy.digestStream(
            new ByteArrayInputStream("abc".getBytes("UTF-8")),
            MessageDigest.getInstance("SHA-1"),
            ContentReadPolicy.MAX_HASH_BYTES,
            () -> false
        );
        assertEquals("a9993e364706816aba3e25717850c26c9cd0d89d", ContentReadPolicy.toHex(sha1.digest));
    }

    @Test
    public void digestsLargeStreamsAcrossManyChunks() throws Exception {
        byte[] payload = new byte[ContentReadPolicy.STREAM_CHUNK_BYTES * 3 + 17];
        Arrays.fill(payload, (byte) 0x41);
        MessageDigest streamed = MessageDigest.getInstance("SHA-256");
        ContentReadPolicy.StreamDigest result = ContentReadPolicy.digestStream(
            new ByteArrayInputStream(payload),
            streamed,
            ContentReadPolicy.MAX_HASH_BYTES,
            () -> false
        );
        MessageDigest direct = MessageDigest.getInstance("SHA-256");
        direct.update(payload);
        assertTrue(Arrays.equals(direct.digest(), result.digest));
        assertEquals(payload.length, result.size);
    }

    @Test
    public void stopsOversizedStreams() throws Exception {
        byte[] payload = new byte[2048];
        assertThrows(
            ContentReadPolicy.StreamSizeExceededException.class,
            () -> ContentReadPolicy.digestStream(
                new ByteArrayInputStream(payload),
                MessageDigest.getInstance("SHA-256"),
                1024L,
                () -> false
            )
        );
        assertThrows(
            ContentReadPolicy.StreamSizeExceededException.class,
            () -> ContentReadPolicy.readBounded(new ByteArrayInputStream(payload), 1024L)
        );
    }

    @Test
    public void honoursCancellationBetweenChunks() throws Exception {
        byte[] payload = new byte[ContentReadPolicy.STREAM_CHUNK_BYTES + 16];
        // Cancel from the second chunk onward; the first chunk must be streamed before that.
        assertThrows(
            ContentReadPolicy.StreamCancelledException.class,
            () -> ContentReadPolicy.digestStream(
                new ByteArrayInputStream(payload),
                MessageDigest.getInstance("SHA-256"),
                ContentReadPolicy.MAX_HASH_BYTES,
                new BooleanSupplierAfterReads(1)
            )
        );
    }

    @Test
    public void readsBoundedContentExactly() throws Exception {
        byte[] payload = "safe fixture".getBytes("UTF-8");
        assertTrue(Arrays.equals(payload, ContentReadPolicy.readBounded(
            new ByteArrayInputStream(payload), ContentReadPolicy.MAX_READ_BYTES)));
        assertEquals(0, ContentReadPolicy.readBounded(new ByteArrayInputStream(new byte[0]), 1L).length);
    }

    @Test
    public void encodesHexLowercase() {
        assertEquals("00ff80", ContentReadPolicy.toHex(new byte[] {0, (byte) 255, (byte) 128}));
        assertNotNull(ContentReadPolicy.SUPPORTED_DIGEST_ALGORITHMS);
    }

    @Test
    public void keepsTheDocumentedStreamContract() {
        assertEquals(64 * 1024, ContentReadPolicy.STREAM_CHUNK_BYTES);
        assertEquals(16L * 1024L * 1024L, ContentReadPolicy.MAX_READ_BYTES);
        assertEquals(1024L * 1024L * 1024L, ContentReadPolicy.MAX_HASH_BYTES);
    }

    /** Simple cancellation supplier for tests: cancels once a counter has been incremented. */
    static final class BooleanSupplierAfterReads
        implements java.util.function.BooleanSupplier {

        private final int afterReads;
        private int reads;

        BooleanSupplierAfterReads(int afterReads) {
            this.afterReads = afterReads;
        }

        @Override
        public boolean getAsBoolean() {
            // The stream checks cancellation before each chunk; the payload spans two chunks.
            reads++;
            return reads > afterReads;
        }
    }
}
