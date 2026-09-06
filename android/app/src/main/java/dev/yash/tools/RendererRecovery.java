package dev.yash.tools;

import android.app.Activity;
import android.graphics.Typeface;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.appcompat.widget.AppCompatButton;
import com.getcapacitor.Bridge;
import com.getcapacitor.WebViewListener;

/**
 * Detects WebView renderer termination through the Capacitor bridge listener. The renderer is
 * dead when this runs, so the crashed WebView is never touched: at most one automatic Activity
 * recreation happens per policy window, and afterwards a native safe-mode screen (with a manual
 * reload action) is shown instead of crash-looping. Always returns true so Capacitor knows the
 * app owns recovery and keeps the process alive.
 */
final class RendererRecovery extends WebViewListener {

    private static final Object SAFE_MODE_TAG = new Object();
    private static final int SAFE_MODE_TEXT_PADDING_DP = 24;
    private static final int SAFE_MODE_TITLE_SP = 20;
    private static final int SAFE_MODE_BODY_SP = 16;

    private final Bridge bridge;

    RendererRecovery(Bridge bridge) {
        this.bridge = bridge;
    }

    @Override
    public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
        long nowMs = SystemClock.elapsedRealtime();
        if (RendererRecoveryPolicy.mayAutoRecover(nowMs)) {
            RendererRecoveryPolicy.recordAutoRecovery(nowMs);
            bridge.getActivity().recreate();
            return true;
        }
        showSafeMode();
        return true;
    }

    private void showSafeMode() {
        Activity activity = bridge.getActivity();
        View contentRoot = activity.findViewById(android.R.id.content);
        if (!(contentRoot instanceof FrameLayout)) {
            return;
        }
        FrameLayout content = (FrameLayout) contentRoot;
        if (content.findViewWithTag(SAFE_MODE_TAG) != null) {
            return;
        }

        FrameLayout overlay = new FrameLayout(activity);
        overlay.setTag(SAFE_MODE_TAG);
        overlay.setBackgroundColor(resolvedThemeColor(activity, android.R.attr.colorBackground));

        LinearLayout column = new LinearLayout(activity);
        column.setOrientation(LinearLayout.VERTICAL);
        column.setGravity(Gravity.CENTER);
        column.setPadding(dp(activity, SAFE_MODE_TEXT_PADDING_DP), 0, dp(activity, SAFE_MODE_TEXT_PADDING_DP), 0);

        TextView title = new TextView(activity);
        title.setText(R.string.safe_mode_title);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, SAFE_MODE_TITLE_SP);
        title.setTypeface(null, Typeface.BOLD);
        title.setGravity(Gravity.CENTER);

        TextView body = new TextView(activity);
        body.setText(R.string.safe_mode_body);
        body.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        body.setGravity(Gravity.CENTER);
        int verticalPadding = dp(activity, 16);
        body.setPadding(0, verticalPadding, 0, verticalPadding * 2);

        AppCompatButton reload = new AppCompatButton(activity);
        reload.setText(R.string.safe_mode_reload);
        reload.setMinimumHeight(dp(activity, 48));
        reload.setMinWidth(dp(activity, 96));
        reload.setOnClickListener((dismissedView) -> activity.recreate());

        column.addView(title);
        column.addView(body);
        column.addView(reload);
        overlay.addView(column, new FrameLayout.LayoutParams(-1, -2, Gravity.CENTER));
        content.addView(overlay, new FrameLayout.LayoutParams(-1, -1));

        // The renderer that would render web content is gone; the safe-mode text is the only
        // current surface, so announce it for assistive technology explicitly.
        title.announceForAccessibility(activity.getString(R.string.safe_mode_title));
    }

    private int resolvedThemeColor(Activity activity, int attribute) {
        TypedValue value = new TypedValue();
        if (activity.getTheme().resolveAttribute(attribute, value, true)) {
            return value.data;
        }
        return 0xFF101010;
    }

    private int dp(Activity activity, int value) {
        return Math.round(
            TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value, activity.getResources().getDisplayMetrics())
        );
    }
}