package dev.yash.tools;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.os.Build;
import android.view.View;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.UiDevice;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class BundledAppInstrumentedTest {

    private static final String SYNTHETIC_SENSITIVE_INPUT = "synthetic-session-only-input";

    @Before
    public void clearDurableFixtureState() {
        targetContext().deleteSharedPreferences("CapacitorStorage");
    }

    @After
    public void removeDurableFixtureState() {
        targetContext().deleteSharedPreferences("CapacitorStorage");
    }

    @Test
    public void coldLaunchUsesBundledSecureOriginAndSystemBackReturnsToCatalog() {
        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.assertOrigin(scenario);
            assertTrue(
                "Every executable script must come from the bundled origin.",
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "[...document.scripts].every(script => !script.src || script.src.startsWith(window.location.origin))"
                )
            );

            WebViewTestHarness.navigate(scenario, "#/tool/unit-converter");
            WebViewTestHarness.waitForText(scenario, "Unit Converter");
            UiDevice.getInstance(InstrumentationRegistry.getInstrumentation()).pressBack();
            WebViewTestHarness.waitForText(scenario, "Useful tools, ready when you are");
        }
    }

    @Test
    public void activityRecreationRestoresSafeRouteAndThemeButNotSensitiveInput() {
        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            scenario.onActivity(activity -> {
                View webView = activity.getBridge().getWebView();
                assertFalse("WebView hierarchy saving must stay disabled.", webView.isSaveEnabled());
                assertFalse(
                    "Parent hierarchy saving must stay disabled.",
                    webView.isSaveFromParentEnabled()
                );
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    assertTrue(
                        "WebView must be excluded from Autofill.",
                        webView.getImportantForAutofill() ==
                        View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS
                    );
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    assertTrue(
                        "WebView must be excluded from Content Capture.",
                        webView.getImportantForContentCapture() ==
                        View.IMPORTANT_FOR_CONTENT_CAPTURE_NO_EXCLUDE_DESCENDANTS
                    );
                }
            });
            WebViewTestHarness.navigate(scenario, "#/settings");
            WebViewTestHarness.waitForText(scenario, "Your app, your device");
            WebViewTestHarness.clickButton(scenario, "Dark");
            WebViewTestHarness.waitForCondition(
                scenario,
                "document.documentElement.dataset.theme === 'dark'"
            );

            WebViewTestHarness.navigate(scenario, "#/tool/case-converter");
            WebViewTestHarness.waitForText(scenario, "Case Converter");
            WebViewTestHarness.setValue(scenario, "#case-input", SYNTHETIC_SENSITIVE_INPUT);
            assertTrue(
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.querySelector('#case-input').value.length > 0"
                )
            );

            scenario.recreate();

            WebViewTestHarness.waitForCondition(
                scenario,
                "document.readyState === 'complete' && document.querySelector('h1') !== null"
            );
            assertTrue(
                "Durable theme preference must survive Activity recreation.",
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.documentElement.dataset.theme === 'dark'"
                )
            );
            assertFalse(
                "Sensitive session input must not be restored after Activity recreation.",
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.body.innerText.includes(" +
                    org.json.JSONObject.quote(SYNTHETIC_SENSITIVE_INPUT) +
                    ")"
                )
            );
            assertTrue(
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.querySelector('#case-input') === null || " +
                    "document.querySelector('#case-input').value === ''"
                )
            );
        }
    }

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }
}
