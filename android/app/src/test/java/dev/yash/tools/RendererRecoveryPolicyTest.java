package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

public class RendererRecoveryPolicyTest {

    private static final long NOW = 10_000_000L;

    @Before
    public void resetPolicy() {
        RendererRecoveryPolicy.resetForTest();
    }

    @Test
    public void allowsOneAutomaticRecoveryPerWindow() {
        assertTrue(RendererRecoveryPolicy.mayAutoRecover(NOW));
        RendererRecoveryPolicy.recordAutoRecovery(NOW);
        assertFalse(RendererRecoveryPolicy.mayAutoRecover(NOW + 1L));
    }

    @Test
    public void allowsAutomaticRecoveryAgainAfterTheWindowExpires() {
        RendererRecoveryPolicy.recordAutoRecovery(NOW);
        assertFalse(RendererRecoveryPolicy.mayAutoRecover(NOW + 30_000L));
        assertTrue(
            RendererRecoveryPolicy.mayAutoRecover(NOW + RendererRecoveryPolicy.AUTO_RECOVERY_WINDOW_MS)
        );
        RendererRecoveryPolicy.recordAutoRecovery(NOW + RendererRecoveryPolicy.AUTO_RECOVERY_WINDOW_MS);
        assertFalse(
            RendererRecoveryPolicy.mayAutoRecover(NOW + RendererRecoveryPolicy.AUTO_RECOVERY_WINDOW_MS + 1L)
        );
    }

    @Test
    public void keepsCountingAcrossMultipleRecordsInsideTheWindow() {
        RendererRecoveryPolicy.recordAutoRecovery(NOW);
        RendererRecoveryPolicy.recordAutoRecovery(NOW + 10_000L);
        assertFalse(RendererRecoveryPolicy.mayAutoRecover(NOW + 20_000L));
    }

    @Test
    public void treatsStaleWindowStateAsFresh() {
        RendererRecoveryPolicy.recordAutoRecovery(0L);
        long later = RendererRecoveryPolicy.AUTO_RECOVERY_WINDOW_MS + 1L;
        assertTrue(RendererRecoveryPolicy.mayAutoRecover(later));
        RendererRecoveryPolicy.recordAutoRecovery(later);
        assertFalse(RendererRecoveryPolicy.mayAutoRecover(later + 1L));
    }

    @Test
    public void keepsTheDocumentedWindowAndLimit() {
        assertEquals(60L * 1000L, RendererRecoveryPolicy.AUTO_RECOVERY_WINDOW_MS);
        assertEquals(1, RendererRecoveryPolicy.MAX_AUTO_RECOVERIES_PER_WINDOW);
    }
}