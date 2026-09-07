package dev.yash.tools;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.os.PersistableBundle;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.After;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = Build.VERSION_CODES.TIRAMISU)
public final class SensitiveClipboardInstrumentedTest {

    @After
    public void clearSyntheticClipboardValue() {
        clipboard().setPrimaryClip(ClipData.newPlainText("", ""));
    }

    @Test
    public void nativeBridgeDistinguishesSensitiveAndNormalWrites() {
        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.runAsync(
                scenario,
                "window.Capacitor.Plugins.SensitiveClipboard.write({" +
                "contractVersion: 1, value: 'synthetic-sensitive-value', sensitive: true})"
            );

            ClipDescription sensitiveDescription = clipboard().getPrimaryClipDescription();
            assertNotNull(sensitiveDescription);
            PersistableBundle sensitiveExtras = sensitiveDescription.getExtras();
            assertNotNull(sensitiveExtras);
            assertTrue(sensitiveExtras.getBoolean(ClipDescription.EXTRA_IS_SENSITIVE, false));

            WebViewTestHarness.runAsync(
                scenario,
                "window.Capacitor.Plugins.SensitiveClipboard.write({" +
                "contractVersion: 1, value: 'synthetic-normal-value', sensitive: false})"
            );

            ClipDescription normalDescription = clipboard().getPrimaryClipDescription();
            assertNotNull(normalDescription);
            PersistableBundle normalExtras = normalDescription.getExtras();
            assertFalse(
                normalExtras != null &&
                normalExtras.getBoolean(ClipDescription.EXTRA_IS_SENSITIVE, false)
            );
        }
    }

    private ClipboardManager clipboard() {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        return (ClipboardManager) context.getSystemService(Context.CLIPBOARD_SERVICE);
    }
}
