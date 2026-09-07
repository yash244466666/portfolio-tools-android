package dev.yash.tools;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeTrue;

import android.content.Context;
import android.os.Bundle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.util.Map;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

/** Two host-orchestrated phases that prove behavior across actual app process termination. */
@RunWith(AndroidJUnit4.class)
public final class ProcessRecreationInstrumentedTest {

    private static final String PHASE_ARGUMENT = "processRecreationPhase";
    private static final String SYNTHETIC_SENSITIVE_INPUT = "synthetic-process-only-input";

    @After
    public void clearFixtureAfterVerification() {
        if ("verify".equals(phase())) {
            targetContext().deleteSharedPreferences("CapacitorStorage");
        }
    }

    @Test
    public void prepareDurableAndSensitiveState() {
        assumeTrue("prepare".equals(phase()));
        targetContext().deleteSharedPreferences("CapacitorStorage");

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.navigate(scenario, "#/settings");
            WebViewTestHarness.waitForText(scenario, "Your app, your device");
            WebViewTestHarness.clickButton(scenario, "Dark");
            WebViewTestHarness.waitForCondition(
                scenario,
                "document.documentElement.dataset.theme === 'dark'"
            );
            WebViewTestHarness.navigate(scenario, "#/tool/hash-generator");
            WebViewTestHarness.waitForText(scenario, "Hash Generator");
            WebViewTestHarness.setValue(scenario, "#hash-input", SYNTHETIC_SENSITIVE_INPUT);
            WebViewTestHarness.waitForCondition(
                scenario,
                "document.querySelector('#hash-input').value.length > 0"
            );
            WebViewTestHarness.waitForCondition(
                scenario,
                "window.location.hash === '#/tool/hash-generator'"
            );
        }

        assertFalse("Sensitive fixture must not enter Preferences.", preferencesContainFixture());
        assertTrue(
            "Durable theme fixture was not written before process termination.",
            !targetContext()
                .getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
                .getAll()
                .isEmpty()
        );
    }

    @Test
    public void verifyFreshProcessRestoresOnlyDurableState() {
        assumeTrue("verify".equals(phase()));
        assertFalse("Sensitive fixture survived in Preferences.", preferencesContainFixture());

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.waitForCondition(
                scenario,
                "document.documentElement.dataset.theme === 'dark'"
            );
            assertFalse(
                "Fresh process rendered a prior sensitive fixture.",
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.body.innerText.includes(" +
                    org.json.JSONObject.quote(SYNTHETIC_SENSITIVE_INPUT) +
                    ")"
                )
            );
            WebViewTestHarness.navigate(scenario, "#/tool/hash-generator");
            // A catalog card also contains this title, so wait for the tool's own input
            // element rather than text that matches before the lazy chunk has rendered.
            WebViewTestHarness.waitForCondition(
                scenario,
                "document.querySelector('#hash-input') !== null"
            );
            assertTrue(
                "Fresh process must start with an empty sensitive input.",
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.querySelector('#hash-input').value === ''"
                )
            );
        }
    }

    private boolean preferencesContainFixture() {
        Map<String, ?> preferences = targetContext()
            .getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
            .getAll();
        return preferences
            .values()
            .stream()
            .anyMatch(value -> String.valueOf(value).contains(SYNTHETIC_SENSITIVE_INPUT));
    }

    private String phase() {
        Bundle arguments = InstrumentationRegistry.getArguments();
        return arguments.getString(PHASE_ARGUMENT, "");
    }

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }
}
