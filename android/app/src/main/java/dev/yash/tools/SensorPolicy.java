package dev.yash.tools;

import android.hardware.Sensor;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Pure validation and mapping for the app-owned PhoneSensors bridge. Sensor
 * reads require no Android permission; the policy only bounds the request and
 * translates contract kinds to SensorManager types.
 */
final class SensorPolicy {

    static final int CONTRACT_VERSION = 1;
    static final int MIN_INTERVAL_MS = 20;
    static final int MAX_INTERVAL_MS = 500;
    static final int DEFAULT_INTERVAL_MS = 50;

    static final String ACCELEROMETER = "accelerometer";
    static final String LINEAR_ACCELERATION = "linear-acceleration";
    static final String MAGNETOMETER = "magnetometer";
    static final String BAROMETER = "barometer";
    static final String LIGHT = "light";

    static final Set<String> KINDS = Collections.unmodifiableSet(
        new HashSet<>(
            Arrays.asList(ACCELEROMETER, LINEAR_ACCELERATION, MAGNETOMETER, BAROMETER, LIGHT)
        )
    );

    private SensorPolicy() {}

    static boolean isValidKind(String kind) {
        return kind != null && KINDS.contains(kind.toLowerCase(Locale.ROOT));
    }

    /** Returns the unique validated kinds in request order, or null when invalid. */
    static List<String> validateKinds(List<?> requested) {
        if (requested == null || requested.isEmpty() || requested.size() > KINDS.size()) {
            return null;
        }
        List<String> kinds = new ArrayList<>();
        for (Object value : requested) {
            if (!(value instanceof String)) {
                return null;
            }
            String kind = ((String) value).toLowerCase(Locale.ROOT);
            if (!isValidKind(kind) || kinds.contains(kind)) {
                return null;
            }
            kinds.add(kind);
        }
        return kinds;
    }

    /** Clamps a requested interval into 20–500 ms; null for non-finite or non-positive input. */
    static Integer validateInterval(Object requested) {
        if (requested == null) {
            return DEFAULT_INTERVAL_MS;
        }
        if (!(requested instanceof Number)) {
            return null;
        }
        double value = ((Number) requested).doubleValue();
        if (!Double.isFinite(value) || value <= 0) {
            return null;
        }
        long rounded = Math.round(value);
        return (int) Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, rounded));
    }

    static int sensorTypeFor(String kind) {
        switch (kind) {
            case ACCELEROMETER:
                return Sensor.TYPE_ACCELEROMETER;
            case LINEAR_ACCELERATION:
                return Sensor.TYPE_LINEAR_ACCELERATION;
            case MAGNETOMETER:
                return Sensor.TYPE_MAGNETIC_FIELD;
            case BAROMETER:
                return Sensor.TYPE_PRESSURE;
            case LIGHT:
                return Sensor.TYPE_LIGHT;
            default:
                return -1;
        }
    }

    static String kindForSensorType(int type) {
        switch (type) {
            case Sensor.TYPE_ACCELEROMETER:
                return ACCELEROMETER;
            case Sensor.TYPE_LINEAR_ACCELERATION:
                return LINEAR_ACCELERATION;
            case Sensor.TYPE_MAGNETIC_FIELD:
                return MAGNETOMETER;
            case Sensor.TYPE_PRESSURE:
                return BAROMETER;
            case Sensor.TYPE_LIGHT:
                return LIGHT;
            default:
                return null;
        }
    }

    static int valueCount(String kind) {
        return BAROMETER.equals(kind) || LIGHT.equals(kind) ? 1 : 3;
    }
}
