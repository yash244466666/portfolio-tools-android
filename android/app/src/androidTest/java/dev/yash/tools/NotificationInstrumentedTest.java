package dev.yash.tools;

import static androidx.test.espresso.intent.Intents.intended;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import static androidx.test.espresso.intent.VerificationModes.times;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.intent.Intents;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.By;
import androidx.test.uiautomator.UiDevice;
import androidx.test.uiautomator.UiObject2;
import androidx.test.uiautomator.Until;
import java.util.regex.Pattern;
import org.junit.After;
import org.junit.Before;
import org.junit.FixMethodOrder;
import org.junit.Test;
import org.junit.runners.MethodSorters;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = Build.VERSION_CODES.TIRAMISU)
@FixMethodOrder(MethodSorters.NAME_ASCENDING)
public final class NotificationInstrumentedTest {

    private static final String NOTIFICATION_STORE = "NOTIFICATION_STORE";
    private static final String POMODORO_NOTIFICATION_ID = "pomodoro-phase";

    @Before
    public void preparePermissionAndStorage() {
        Intents.init();
        targetContext().deleteSharedPreferences("CapacitorStorage");
        targetContext().deleteSharedPreferences(NOTIFICATION_STORE);
    }

    @After
    public void restorePermissionAndStorage() {
        InstrumentationRegistry
            .getInstrumentation()
            .getUiAutomation()
            .grantRuntimePermission(targetContext().getPackageName(), Manifest.permission.POST_NOTIFICATIONS);
        targetContext().deleteSharedPreferences("CapacitorStorage");
        targetContext().deleteSharedPreferences(NOTIFICATION_STORE);
        Intents.release();
    }

    @Test
    public void a_deniedNotificationPermissionKeepsTimerUsableAndShowsRecovery() {
        String packageName = targetContext().getPackageName();
        UiDevice device = UiDevice.getInstance(InstrumentationRegistry.getInstrumentation());

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            openPomodoro(scenario);
            WebViewTestHarness.clickButton(scenario, "Alert me at phase end");

            UiObject2 deny = device.wait(
                Until.findObject(By.res("com.android.permissioncontroller", "permission_deny_button")),
                5_000L
            );
            if (deny == null) {
                deny = device.wait(
                    Until.findObject(
                        By.text(Pattern.compile("Don.t allow|Deny", Pattern.CASE_INSENSITIVE))
                    ),
                    5_000L
                );
            }
            assertNotNull("Android notification denial action was not shown.", deny);
            deny.click();

            WebViewTestHarness.waitForCondition(
                scenario,
                "document.body.innerText.includes('Notification permission was declined') || " +
                "document.body.innerText.includes('Notifications are not available')"
            );
            assertFalse(
                targetContext()
                    .getPackageManager()
                    .checkPermission(Manifest.permission.POST_NOTIFICATIONS, packageName) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
            );
            WebViewTestHarness.clickButton(scenario, "Start");
            WebViewTestHarness.waitForText(scenario, "Focus session running.");
        }
    }

    @Test
    public void b_grantedNotificationsCreateStableChannelScheduleInexactlyAndCancel() {
        InstrumentationRegistry
            .getInstrumentation()
            .getUiAutomation()
            .grantRuntimePermission(targetContext().getPackageName(), Manifest.permission.POST_NOTIFICATIONS);

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            openPomodoro(scenario);
            WebViewTestHarness.clickButton(scenario, "Alert me at phase end");
            WebViewTestHarness.waitForText(scenario, "You will be alerted at the end of each phase.");
            WebViewTestHarness.clickButton(scenario, "Start");
            WebViewTestHarness.waitForText(scenario, "Focus session running.");

            int notificationId = Math.abs(POMODORO_NOTIFICATION_ID.hashCode());
            if (notificationId == 0) notificationId = 1;
            waitForStoredNotification(String.valueOf(notificationId), true);

            NotificationManager manager = (NotificationManager) targetContext().getSystemService(
                Context.NOTIFICATION_SERVICE
            );
            NotificationChannel channel = manager.getNotificationChannel("timers");
            assertNotNull("Stable timers notification channel was not created.", channel);
            assertTrue(
                "Timer channel must use ordinary default importance.",
                channel.getImportance() == NotificationManager.IMPORTANCE_DEFAULT
            );
            intended(hasAction(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM), times(0));

            WebViewTestHarness.clickButton(scenario, "Pause");
            WebViewTestHarness.waitForText(scenario, "Timer paused.");
            waitForStoredNotification(String.valueOf(notificationId), false);
        }
    }

    private void openPomodoro(ActivityScenario<MainActivity> scenario) {
        WebViewTestHarness.navigate(scenario, "#/tool/pomodoro-timer");
        WebViewTestHarness.waitForText(scenario, "Pomodoro Timer");
        WebViewTestHarness.waitForCondition(
            scenario,
            "[...document.querySelectorAll('button')].some(button => " +
            "button.textContent.trim() === 'Alert me at phase end' && !button.disabled)"
        );
    }

    private void waitForStoredNotification(String id, boolean expected) {
        long deadline = SystemClock.uptimeMillis() + 5_000L;
        while (SystemClock.uptimeMillis() < deadline) {
            boolean present = targetContext()
                .getSharedPreferences(NOTIFICATION_STORE, Context.MODE_PRIVATE)
                .contains(id);
            if (present == expected) return;
            SystemClock.sleep(50L);
        }
        boolean present = targetContext()
            .getSharedPreferences(NOTIFICATION_STORE, Context.MODE_PRIVATE)
            .contains(id);
        assertTrue("Notification schedule storage did not reach the expected state.", present == expected);
    }

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }
}
