package dev.yash.tools;

import static androidx.test.espresso.Espresso.onView;
import static androidx.test.espresso.action.ViewActions.click;
import static androidx.test.espresso.assertion.ViewAssertions.matches;
import static androidx.test.espresso.matcher.ViewMatchers.isDisplayed;
import static androidx.test.espresso.matcher.ViewMatchers.withText;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertTrue;

import android.os.Build;
import android.os.SystemClock;
import android.util.TypedValue;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.SdkSuppress;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@SdkSuppress(minSdkVersion = Build.VERSION_CODES.O)
public final class RendererRecoveryInstrumentedTest {

    @Before
    public void resetRecoveryBudget() {
        RendererRecoveryPolicy.resetForTest();
    }

    @After
    public void clearRecoveryBudget() {
        RendererRecoveryPolicy.resetForTest();
    }

    @Test
    public void firstRendererTerminationRecreatesActivityAndReloadsBundledApp() {
        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            AtomicInteger originalActivity = new AtomicInteger();
            scenario.onActivity(activity -> originalActivity.set(System.identityHashCode(activity)));
            scenario.onActivity(activity ->
                assertTrue(
                    new RendererRecovery(activity.getBridge()).onRenderProcessGone(null, null)
                )
            );

            WebViewTestHarness.waitForText(scenario, "Useful tools, ready when you are");
            AtomicInteger recreatedActivity = new AtomicInteger();
            scenario.onActivity(activity -> recreatedActivity.set(System.identityHashCode(activity)));
            assertNotEquals(originalActivity.get(), recreatedActivity.get());
        }
    }

    @Test
    public void repeatedTerminationShowsAccessibleNativeSafeModeWithManualReload() {
        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            RendererRecoveryPolicy.recordAutoRecovery(SystemClock.elapsedRealtime());
            scenario.onActivity(activity ->
                assertTrue(
                    new RendererRecovery(activity.getBridge()).onRenderProcessGone(null, null)
                )
            );

            onView(withText(R.string.safe_mode_title)).check(matches(isDisplayed()));
            onView(withText(R.string.safe_mode_body)).check(matches(isDisplayed()));
            onView(withText(R.string.safe_mode_reload))
                .check((view, noViewFound) -> {
                    if (noViewFound != null) throw noViewFound;
                    int minimumPixels = Math.round(
                        TypedValue.applyDimension(
                            TypedValue.COMPLEX_UNIT_DIP,
                            48,
                            view.getResources().getDisplayMetrics()
                        )
                    );
                    assertTrue("Safe-mode reload action must be at least 48 dp tall.", view.getHeight() >= minimumPixels);
                })
                .perform(click());

            WebViewTestHarness.waitForText(scenario, "Useful tools, ready when you are");
            WebViewTestHarness.assertOrigin(scenario);
        }
    }
}
