package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class ClipboardPolicyTest {

    @Test
    public void validatesVersionedWriteRequests() {
        ClipboardPolicy.WriteRequest request = ClipboardPolicy.validateWrite(1, "secret value", true);
        assertNotNull(request);
        assertEquals("secret value", request.value);
        assertTrue(request.sensitive);

        ClipboardPolicy.WriteRequest normal = ClipboardPolicy.validateWrite(1.0d, "plain", false);
        assertNotNull(normal);
        assertFalse(normal.sensitive);
    }

    @Test
    public void acceptsEmptyValueForTimedClipboardClearing() {
        ClipboardPolicy.WriteRequest request = ClipboardPolicy.validateWrite(1, "", false);
        assertNotNull(request);
        assertEquals("", request.value);
    }

    @Test
    public void rejectsWrongContractVersions() {
        assertNull(ClipboardPolicy.validateWrite(2, "value", false));
        assertNull(ClipboardPolicy.validateWrite(null, "value", false));
        assertNull(ClipboardPolicy.validateWrite("1", "value", false));
    }

    @Test
    public void rejectsMissingValuesAndSensitiveFlags() {
        assertNull(ClipboardPolicy.validateWrite(1, null, false));
        assertNull(ClipboardPolicy.validateWrite(1, "value", null));
        assertNull(ClipboardPolicy.validateWrite(1, "value", "true"));
        assertNull(ClipboardPolicy.validateWrite(1, "value", 1));
    }

    @Test
    public void enforcesTheClipboardWriteLimit() {
        ClipboardPolicy.WriteRequest atLimit = ClipboardPolicy.validateWrite(
            1,
            "a".repeat((int) ClipboardPolicy.MAX_WRITE_BYTES),
            false
        );
        assertNotNull(atLimit);

        assertNull(ClipboardPolicy.validateWrite(1, "a".repeat((int) ClipboardPolicy.MAX_WRITE_BYTES + 1), false));
        // Four-byte UTF-8 code points reach the byte limit faster than the character count.
        assertNull(ClipboardPolicy.validateWrite(1, "😀".repeat((int) ClipboardPolicy.MAX_WRITE_BYTES / 2), false));
    }

    @Test
    public void marksSensitiveOnlyOnSupportedAndroidVersions() {
        assertFalse(ClipboardPolicy.markSensitive(23));
        assertFalse(ClipboardPolicy.markSensitive(32));
        assertTrue(ClipboardPolicy.markSensitive(33));
        assertTrue(ClipboardPolicy.markSensitive(34));
    }

    @Test
    public void keepsTheStableBridgeContractVersion() {
        assertEquals(1, ClipboardPolicy.CONTRACT_VERSION);
    }
}