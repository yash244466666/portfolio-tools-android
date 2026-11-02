package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class NetworkDiagnosticsPolicyTest {

    @Test
    public void treatsNonPositiveLinkEstimatesAsUnknown() {
        assertNull(NetworkDiagnosticsPolicy.positiveOrNull(0));
        assertNull(NetworkDiagnosticsPolicy.positiveOrNull(-1));
        assertEquals(Integer.valueOf(72_000), NetworkDiagnosticsPolicy.positiveOrNull(72_000));
    }

    @Test
    public void treatsMinusOneAndOutOfRangeSignalsAsUnknown() {
        assertNull(NetworkDiagnosticsPolicy.signalOrNull(-1));
        assertNull(NetworkDiagnosticsPolicy.signalOrNull(-201));
        assertNull(NetworkDiagnosticsPolicy.signalOrNull(201));
        assertEquals(Integer.valueOf(0), NetworkDiagnosticsPolicy.signalOrNull(0));
        assertEquals(Integer.valueOf(-67), NetworkDiagnosticsPolicy.signalOrNull(-67));
    }

    @Test
    public void distinguishesUnsupportedTrafficCounters() {
        assertFalse(NetworkDiagnosticsPolicy.countersSupported(-1L, 0L));
        assertFalse(NetworkDiagnosticsPolicy.countersSupported(0L, -1L));
        assertFalse(NetworkDiagnosticsPolicy.countersSupported(-2L, 10L));
        assertTrue(NetworkDiagnosticsPolicy.countersSupported(0L, 0L));
        assertTrue(NetworkDiagnosticsPolicy.countersSupported(1_024L, 2_048L));
    }

    @Test
    public void boundsAndSanitizesDisplayedAddresses() {
        assertNull(NetworkDiagnosticsPolicy.boundedAddress(null));
        assertNull(NetworkDiagnosticsPolicy.boundedAddress(""));
        assertNull(
            NetworkDiagnosticsPolicy.boundedAddress(
                String.valueOf((char) 0x0000) +
                String.valueOf((char) 0x001f) +
                String.valueOf((char) 0x200e)
            )
        );
        assertEquals(
            "192.168.1.10",
            NetworkDiagnosticsPolicy.boundedAddress("  192.168.1.10  ")
        );
        assertEquals(
            "fe80::1%wlan0",
            NetworkDiagnosticsPolicy.boundedAddress("fe80::1%wlan0")
        );
        String overlong = "a".repeat(400);
        String bounded = NetworkDiagnosticsPolicy.boundedAddress(overlong);
        assertEquals(NetworkDiagnosticsPolicy.MAX_ADDRESS_LENGTH, bounded.length());
    }

    @Test
    public void stripsLineAndDirectionControlsFromAddresses() {
        assertEquals(
            "10.0.0.1gnp.exe",
            NetworkDiagnosticsPolicy.boundedAddress(
                "10.0.0.1" +
                String.valueOf((char) 0x202e) +
                String.valueOf((char) 0x2028) +
                "gnp.exe"
            )
        );
    }
}
