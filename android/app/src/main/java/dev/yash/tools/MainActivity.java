package dev.yash.tools;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.autofill.AutofillManager;
import android.webkit.WebView;
import android.webkit.WebViewDatabase;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentFilesPlugin.class);
        registerPlugin(SensitiveClipboardPlugin.class);
        registerPlugin(GeneratedCachePlugin.class);
        registerPlugin(PhoneSensorsPlugin.class);
        registerPlugin(NetworkDiagnosticsPlugin.class);
        super.onCreate(savedInstanceState);
        configurePrivateWebViewSession();
        installBackNavigation();
        getBridge().addWebViewListener(new RendererRecovery(getBridge()));
    }

    @SuppressWarnings("deprecation")
    private void configurePrivateWebViewSession() {
        // Tool input is session-only unless a reviewed platform persistence contract says
        // otherwise. Block the Android view hierarchy, legacy WebView form store, Autofill,
        // and Content Capture from becoming undeclared persistence paths. Reviewed durable
        // state reconstructs through Preferences instead.
        WebView webView = getBridge().getWebView();
        webView.setSaveEnabled(false);
        webView.setSaveFromParentEnabled(false);
        webView.getSettings().setSaveFormData(false);
        WebViewDatabase.getInstance(getApplicationContext()).clearFormData();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            webView.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            webView.setImportantForContentCapture(
                View.IMPORTANT_FOR_CONTENT_CAPTURE_NO_EXCLUDE_DESCENDANTS
            );
        }
    }

    @Override
    public void onStop() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AutofillManager autofill = getSystemService(AutofillManager.class);
            if (autofill != null) {
                autofill.cancel();
            }
        }
        super.onStop();
    }

    private void installBackNavigation() {
        getOnBackPressedDispatcher().addCallback(
            this,
            new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    WebView webView = getBridge().getWebView();
                    webView.evaluateJavascript(
                        "(() => { const hash = window.location.hash; " +
                        "if (hash && hash !== '#' && hash !== '#/') { " +
                        "window.location.hash = '#/'; return true; } return false; })()",
                        handled -> {
                            if (!"true".equals(handled)) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                                setEnabled(true);
                            }
                        }
                    );
                }
            }
        );
    }
}
