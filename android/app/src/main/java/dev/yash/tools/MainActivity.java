package dev.yash.tools;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DocumentFilesPlugin.class);
        registerPlugin(SensitiveClipboardPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
