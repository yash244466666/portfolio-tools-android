package dev.yash.tools;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;

/**
 * App-owned, versioned bridge to the Android SensorManager for the permission-
 * free sensors used by the sensor tools. The bridge caps the sampling interval,
 * emits only requested kinds, stops when the Activity pauses or is destroyed,
 * and never logs or persists samples. It registers no permission and no
 * background service.
 */
@CapacitorPlugin(name = "PhoneSensors")
public final class PhoneSensorsPlugin extends Plugin implements SensorEventListener {

    private static final String ERROR_INVALID = "SENSOR_INVALID_ARGUMENT";
    private static final String ERROR_UNAVAILABLE = "SENSOR_UNAVAILABLE";
    private static final String ERROR_ACTIVE = "SENSOR_ALREADY_ACTIVE";
    private static final String ERROR_START = "SENSOR_START_FAILED";

    private final Object lock = new Object();
    private final Map<String, Sensor> activeSensors = new HashMap<>();
    private final Map<String, Long> lastEmitMs = new HashMap<>();
    private final Map<String, Integer> accuracyByKind = new HashMap<>();
    private SensorManager sensorManager;
    private int intervalMs = SensorPolicy.DEFAULT_INTERVAL_MS;
    private boolean sampling;

    @PluginMethod
    public void available(PluginCall call) {
        JSArray sensors = new JSArray();
        SensorManager manager = sensorManager();
        for (String kind : new String[] {
            SensorPolicy.ACCELEROMETER,
            SensorPolicy.LINEAR_ACCELERATION,
            SensorPolicy.MAGNETOMETER,
            SensorPolicy.BAROMETER,
            SensorPolicy.LIGHT,
        }) {
            Sensor sensor = manager == null
                ? null
                : manager.getDefaultSensor(SensorPolicy.sensorTypeFor(kind));
            JSObject entry = new JSObject();
            entry.put("kind", kind);
            entry.put("available", sensor != null);
            sensors.put(entry);
        }
        JSObject result = new JSObject();
        result.put("contractVersion", SensorPolicy.CONTRACT_VERSION);
        result.put("sensors", sensors);
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        Object version = call.getData().opt("contractVersion");
        if (
            !(version instanceof Number) ||
            ((Number) version).doubleValue() != SensorPolicy.CONTRACT_VERSION
        ) {
            call.reject("The sensor request version is unsupported.", ERROR_INVALID);
            return;
        }
        Object rawKinds = call.getData().opt("kinds");
        List<Object> kindValues = null;
        if (rawKinds instanceof JSONArray) {
            JSONArray array = (JSONArray) rawKinds;
            kindValues = new ArrayList<>();
            try {
                for (int index = 0; index < array.length(); index += 1) {
                    kindValues.add(array.get(index));
                }
            } catch (JSONException ignored) {
                kindValues = null;
            }
        } else if (rawKinds instanceof List<?>) {
            kindValues = new ArrayList<>((List<?>) rawKinds);
        }
        List<String> kinds = SensorPolicy.validateKinds(kindValues);
        Integer requestedInterval = SensorPolicy.validateInterval(call.getData().opt("intervalMs"));
        if (kinds == null || requestedInterval == null) {
            call.reject("The sensor request is invalid.", ERROR_INVALID);
            return;
        }

        SensorManager manager = sensorManager();
        if (manager == null) {
            call.reject("This device has no sensor service.", ERROR_UNAVAILABLE);
            return;
        }

        synchronized (lock) {
            if (sampling) {
                call.reject("A sensor session is already active.", ERROR_ACTIVE);
                return;
            }
            List<Sensor> resolved = new ArrayList<>();
            for (String kind : kinds) {
                Sensor sensor = manager.getDefaultSensor(SensorPolicy.sensorTypeFor(kind));
                if (sensor == null) {
                    call.reject("A requested phone sensor is not available.", ERROR_UNAVAILABLE);
                    return;
                }
                resolved.add(sensor);
            }

            activeSensors.clear();
            lastEmitMs.clear();
            accuracyByKind.clear();
            for (int index = 0; index < kinds.size(); index += 1) {
                activeSensors.put(kinds.get(index), resolved.get(index));
                lastEmitMs.put(kinds.get(index), 0L);
                accuracyByKind.put(kinds.get(index), 0);
            }
            intervalMs = requestedInterval;
            sampling = true;
            for (int index = 0; index < kinds.size(); index += 1) {
                boolean registered = manager.registerListener(
                    this,
                    resolved.get(index),
                    intervalMs * 1000
                );
                if (!registered) {
                    stopSamplingLocked();
                    call.reject("A phone sensor could not be started.", ERROR_START);
                    return;
                }
            }
        }

        JSArray resultKinds = new JSArray();
        for (String kind : kinds) resultKinds.put(kind);
        JSObject result = new JSObject();
        result.put("contractVersion", SensorPolicy.CONTRACT_VERSION);
        result.put("kinds", resultKinds);
        result.put("intervalMs", intervalMs);
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopSampling();
        call.resolve();
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        String kind = SensorPolicy.kindForSensorType(event.sensor.getType());
        if (kind == null) return;
        long timestampMs = event.timestamp / 1_000_000L;
        synchronized (lock) {
            if (!sampling || !activeSensors.containsKey(kind)) return;
            Long last = lastEmitMs.get(kind);
            if (last != null && timestampMs - last < intervalMs) return;
            lastEmitMs.put(kind, timestampMs);
        }

        JSArray values = new JSArray();
        int count = Math.min(SensorPolicy.valueCount(kind), event.values.length);
        for (int index = 0; index < count; index += 1) {
            values.put(Double.valueOf(event.values[index]));
        }
        Integer accuracy;
        synchronized (lock) {
            accuracy = accuracyByKind.get(kind);
        }
        JSObject payload = new JSObject();
        payload.put("kind", kind);
        payload.put("timestampMs", timestampMs);
        payload.put("values", values);
        payload.put("accuracy", accuracy == null ? 0 : accuracy);
        notifyListeners("sensorSample", payload);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        String kind = SensorPolicy.kindForSensorType(sensor.getType());
        if (kind == null) return;
        synchronized (lock) {
            accuracyByKind.put(kind, Math.min(3, Math.max(0, accuracy)));
        }
    }

    @Override
    protected void handleOnPause() {
        stopSampling();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        stopSampling();
        super.handleOnDestroy();
    }

    private void stopSampling() {
        synchronized (lock) {
            stopSamplingLocked();
        }
    }

    private void stopSamplingLocked() {
        SensorManager manager = sensorManager;
        if (manager != null) manager.unregisterListener(this);
        activeSensors.clear();
        lastEmitMs.clear();
        accuracyByKind.clear();
        sampling = false;
    }

    private SensorManager sensorManager() {
        if (sensorManager == null) {
            sensorManager =
                (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        }
        return sensorManager;
    }
}
