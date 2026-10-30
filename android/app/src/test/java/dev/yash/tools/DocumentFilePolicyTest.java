package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class DocumentFilePolicyTest {

    @Test
    public void validatesCanonicalOperationIds() {
        assertTrue(DocumentFilePolicy.isValidOperationId("123e4567-e89b-42d3-a456-426614174000"));
        assertFalse(DocumentFilePolicy.isValidOperationId("123E4567-E89B-42D3-A456-426614174000"));
        assertFalse(DocumentFilePolicy.isValidOperationId("../not-an-operation"));
    }

    @Test
    public void validatesConcreteAndPickerMimeTypes() {
        assertTrue(DocumentFilePolicy.isValidMimeType("text/plain", false));
        assertTrue(DocumentFilePolicy.isValidMimeType("image/*", true));
        assertTrue(DocumentFilePolicy.isValidMimeType("*/*", true));
        assertFalse(DocumentFilePolicy.isValidMimeType("image/*", false));
        assertFalse(DocumentFilePolicy.isValidMimeType("Text/Plain", false));
        assertFalse(DocumentFilePolicy.isValidMimeType("text/plain; charset=utf-8", false));
        assertFalse(DocumentFilePolicy.isValidMimeType("../*", true));
    }

    @Test
    public void matchesMimeTypesWithoutTrustingFileExtensions() {
        assertTrue(DocumentFilePolicy.mimeTypeMatches("image/*", "image/png"));
        assertTrue(DocumentFilePolicy.mimeTypeMatches("*/*", "application/octet-stream"));
        assertTrue(DocumentFilePolicy.mimeTypeMatches("application/json", "application/json"));
        assertFalse(DocumentFilePolicy.mimeTypeMatches("image/*", "text/plain"));
        assertFalse(DocumentFilePolicy.mimeTypeMatches("application/json", "text/plain"));
    }

    @Test
    public void enforcesDefaultAndHardPickerLimits() {
        assertEquals(DocumentFilePolicy.DEFAULT_MAX_PICK_BYTES, DocumentFilePolicy.validateMaximumPickBytes(null));
        assertEquals(1024L, DocumentFilePolicy.validateMaximumPickBytes(1024L));
        assertThrows(IllegalArgumentException.class, () -> DocumentFilePolicy.validateMaximumPickBytes(0L));
        assertThrows(
            IllegalArgumentException.class,
            () -> DocumentFilePolicy.validateMaximumPickBytes(DocumentFilePolicy.MAX_PICK_BYTES + 1)
        );
    }

    @Test
    public void truncatesExistingProviderOutputBeforeWriting() {
        assertEquals("wt", DocumentFilePolicy.SAVE_OUTPUT_MODE);
    }

    @Test
    public void sanitizesDisplayAndOutputNames() {
        assertEquals("-private-output.txt", DocumentFilePolicy.sanitizeFileName("../private\\output.txt"));
        assertEquals("yash-tools-output", DocumentFilePolicy.sanitizeFileName("..."));
        assertEquals("report name.txt", DocumentFilePolicy.sanitizeFileName("  report   name.txt  "));
        assertEquals("a-b", DocumentFilePolicy.sanitizeFileName("a--b"));
        String rlo = new String(new char[] { 0x202E });
        String lineSeparator = new String(new char[] { 0x2028 });
        String isolate = new String(new char[] { 0x2066 });
        assertEquals("photo-gnp.exe", DocumentFilePolicy.sanitizeFileName("photo" + rlo + "gnp.exe"));
        assertEquals("a-b-c", DocumentFilePolicy.sanitizeFileName("a" + lineSeparator + "b" + isolate + "c"));
    }

    @Test
    public void truncatesNamesByUtf8ByteLength() {
        String result = DocumentFilePolicy.sanitizeFileName("😀".repeat(130));
        assertEquals(30, result.codePointCount(0, result.length()));
        assertEquals(120, result.getBytes(java.nio.charset.StandardCharsets.UTF_8).length);
    }
}
