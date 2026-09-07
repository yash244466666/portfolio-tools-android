package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.os.SystemClock;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;

/** Small bridge-aware harness that always drives the bundled WebView on its main thread. */
final class WebViewTestHarness {

    private static final long UI_TIMEOUT_MS = 15_000L;

    private WebViewTestHarness() {}

    static ActivityScenario<MainActivity> launch() {
        ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class);
        waitForCondition(
            scenario,
            "document.readyState === 'complete' && document.querySelector('h1') !== null"
        );
        return scenario;
    }

    static void navigate(ActivityScenario<MainActivity> scenario, String hash) {
        assertTrue(
            "Bundled route could not be changed.",
            evaluateBoolean(scenario, "(() => { window.location.hash = " + JSONObject.quote(hash) + "; return true })()")
        );
    }

    static void clickButton(ActivityScenario<MainActivity> scenario, String label) {
        String script =
            "(() => { const button = [...document.querySelectorAll('button')].find(" +
            "candidate => candidate.textContent.trim() === " +
            JSONObject.quote(label) +
            "); if (!button) return false; button.click(); return true })()";
        waitForCondition(scenario, script);
    }

    static void setValue(ActivityScenario<MainActivity> scenario, String selector, String value) {
        String script =
            "(() => { const element = document.querySelector(" +
            JSONObject.quote(selector) +
            "); if (!element) return false; const prototype = element.tagName === 'TEXTAREA' " +
            "? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; " +
            "Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, " +
            JSONObject.quote(value) +
            "); element.dispatchEvent(new Event('input', { bubbles: true })); return true })()";
        waitForCondition(scenario, script);
    }

    static void runAsync(ActivityScenario<MainActivity> scenario, String promiseExpression) {
        String marker = "native-test-" + SystemClock.elapsedRealtimeNanos();
        String script =
            "(() => { document.documentElement.dataset.nativeTest = ''; Promise.resolve(" +
            promiseExpression +
            ").then(() => document.documentElement.dataset.nativeTest = " +
            JSONObject.quote(marker) +
            ").catch(() => document.documentElement.dataset.nativeTest = 'failed'); return true })()";
        assertTrue("Native bridge operation was not started.", evaluateBoolean(scenario, script));
        waitForCondition(
            scenario,
            "document.documentElement.dataset.nativeTest === " + JSONObject.quote(marker)
        );
    }

    static void waitForText(ActivityScenario<MainActivity> scenario, String text) {
        waitForCondition(
            scenario,
            "document.body && document.body.innerText.includes(" + JSONObject.quote(text) + ")"
        );
    }

    static void waitForCondition(ActivityScenario<MainActivity> scenario, String expression) {
        long deadline = SystemClock.uptimeMillis() + UI_TIMEOUT_MS;
        while (SystemClock.uptimeMillis() < deadline) {
            if (evaluateBoolean(scenario, expression)) {
                return;
            }
            SystemClock.sleep(100L);
        }
        assertTrue("Timed out waiting for bundled application state.", false);
    }

    static boolean evaluateBoolean(ActivityScenario<MainActivity> scenario, String expression) {
        return "true".equals(evaluateRaw(scenario, expression));
    }

    static String evaluateRaw(ActivityScenario<MainActivity> scenario, String expression) {
        AtomicReference<WebView> webView = new AtomicReference<>();
        scenario.onActivity(activity -> webView.set(activity.getBridge().getWebView()));
        AtomicReference<String> result = new AtomicReference<>();
        CountDownLatch complete = new CountDownLatch(1);
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
            webView.get().evaluateJavascript(expression, value -> {
                result.set(value);
                complete.countDown();
            })
        );
        try {
            assertTrue(
                "WebView evaluation timed out.",
                complete.await(UI_TIMEOUT_MS, TimeUnit.MILLISECONDS)
            );
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new AssertionError("WebView evaluation was interrupted.", interrupted);
        }
        return result.get();
    }

    static void assertOrigin(ActivityScenario<MainActivity> scenario) {
        assertEquals("\"https://app.yash.tools\"", evaluateRaw(scenario, "window.location.origin"));
        assertTrue("Bundled origin must be a secure context.", evaluateBoolean(scenario, "window.isSecureContext"));
    }
}
