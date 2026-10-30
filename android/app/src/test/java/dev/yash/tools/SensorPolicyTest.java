package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import android.hardware.Sensor;
import java.util.Arrays;
import java.util.Collections;
import org.junit.Test;

public final class SensorPolicyTest {

    @Test
    public void acceptsEachContractKind() {
        for (String kind : SensorPolicy.KINDS) {
            assertTrue(kind, SensorPolicy.isValidKind(kind));
            assertTrue(kind, SensorPolicy.sensorTypeFor(kind) > 0);
        }
        assertFalse(SensorPolicy.isValidKind("camera"));
        assertFalse(SensorPolicy.isValidKind(null));
    }

    @Test
    public void validatesKindsWithoutDuplicatesOrJunk() {
        assertEquals(
            Arrays.asList("accelerometer", "magnetometer"),
            SensorPolicy.validateKinds(Arrays.asList("accelerometer", "magnetometer"))
        );
        assertNull(SensorPolicy.validateKinds(Collections.emptyList()));
        assertNull(SensorPolicy.validateKinds(Arrays.asList("accelerometer", "accelerometer")));
        assertNull(SensorPolicy.validateKinds(Arrays.asList("accelerometer", "camera")));
        assertNull(SensorPolicy.validateKinds(Arrays.asList(1)));
        assertNull(SensorPolicy.validateKinds(null));
    }

    @Test
    public void clampsIntervalsAndRejectsBadNumbers() {
        assertEquals(Integer.valueOf(50), SensorPolicy.validateInterval(null));
        assertEquals(Integer.valueOf(20), SensorPolicy.validateInterval(1));
        assertEquals(Integer.valueOf(500), SensorPolicy.validateInterval(5000));
        assertEquals(Integer.valueOf(50), SensorPolicy.validateInterval(49.6));
        assertNull(SensorPolicy.validateInterval(0));
        assertNull(SensorPolicy.validateInterval(-1));
        assertNull(SensorPolicy.validateInterval(Double.NaN));
        assertNull(SensorPolicy.validateInterval(Double.POSITIVE_INFINITY));
        assertNull(SensorPolicy.validateInterval("50"));
    }

    @Test
    public void mapsSensorTypesBothWaysAndCountsValues() {
        assertEquals(Sensor.TYPE_ACCELEROMETER, SensorPolicy.sensorTypeFor("accelerometer"));
        assertEquals("magnetometer", SensorPolicy.kindForSensorType(Sensor.TYPE_MAGNETIC_FIELD));
        assertEquals(3, SensorPolicy.valueCount("accelerometer"));
        assertEquals(3, SensorPolicy.valueCount("linear-acceleration"));
        assertEquals(1, SensorPolicy.valueCount("barometer"));
        assertEquals(1, SensorPolicy.valueCount("light"));
        assertNull(SensorPolicy.kindForSensorType(99999));
    }
}
