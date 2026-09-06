package dev.yash.tools;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.content.Context;
import android.os.Build;
import android.os.PersistableBundle;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Narrow app-owned clipboard writer. The only reason this plugin exists is the Android 13+
 * sensitive-clipboard extra, which the official Clipboard plugin cannot express. It never reads
 * the clipboard, never logs the value, and adds no permission or exported component.
 */
@CapacitorPlugin(name = "SensitiveClipboard")
public final class SensitiveClipboardPlugin extends Plugin {

    private static final String ERROR_INVALID_ARGUMENT = "CLIPBOARD_INVALID_ARGUMENT";
    private static final String ERROR_WRITE_FAILED = "CLIPBOARD_WRITE_FAILED";

    @PluginMethod
    public void write(PluginCall call) {
        ClipboardPolicy.WriteRequest request = ClipboardPolicy.validateWrite(
            call.getData().opt("contractVersion"),
            call.getString("value"),
            call.getData().opt("sensitive")
        );
        if (request == null) {
            getBridge().executeOnMainThread(() -> call.reject("The clipboard request is invalid.", ERROR_INVALID_ARGUMENT));
            return;
        }
        getBridge().executeOnMainThread(() -> writeOnMainThread(call, request));
    }

    private void writeOnMainThread(PluginCall call, ClipboardPolicy.WriteRequest request) {
        try {
            ClipboardManager manager =
                (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
            if (manager == null) {
                call.reject("The system clipboard is unavailable.", ERROR_WRITE_FAILED);
                return;
            }
            // The label stays empty so no context about the value enters the system clipboard UI.
            ClipData clip = ClipData.newPlainText("", request.value);
            if (request.sensitive && ClipboardPolicy.markSensitive(Build.VERSION.SDK_INT)) {
                PersistableBundle extra = new PersistableBundle();
                extra.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
                clip.getDescription().setExtras(extra);
            }
            manager.setPrimaryClip(clip);
            call.resolve();
        } catch (RuntimeException ignored) {
            call.reject("The value could not be copied.", ERROR_WRITE_FAILED);
        }
    }
}