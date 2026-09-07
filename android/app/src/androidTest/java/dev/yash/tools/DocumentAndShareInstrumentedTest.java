package dev.yash.tools;

import static androidx.test.espresso.intent.Intents.intended;
import static androidx.test.espresso.intent.Intents.intending;
import static androidx.test.espresso.intent.matcher.IntentMatchers.hasAction;
import static org.junit.Assert.assertArrayEquals;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Activity;
import android.app.Instrumentation;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import androidx.test.core.app.ActivityScenario;
import androidx.test.espresso.intent.Intents;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicReference;
import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.hamcrest.TypeSafeDiagnosingMatcher;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class DocumentAndShareInstrumentedTest {

    private static final byte[] PNG_SIGNATURE = new byte[] {
        (byte) 0x89,
        0x50,
        0x4e,
        0x47,
        0x0d,
        0x0a,
        0x1a,
        0x0a,
    };

    @Before
    public void initializeIntentInterception() {
        Intents.init();
        testContext().getContentResolver().delete(TestDocumentsProvider.OUTPUT_URI, null, null);
        deleteRecursively(new File(targetContext().getCacheDir(), "save"));
        new File(targetContext().getCacheDir(), "share/qr-code.png").delete();
    }

    @After
    public void releaseIntentInterception() {
        new File(targetContext().getCacheDir(), "share/qr-code.png").delete();
        deleteRecursively(new File(targetContext().getCacheDir(), "save"));
        testContext().getContentResolver().delete(TestDocumentsProvider.OUTPUT_URI, null, null);
        Intents.release();
    }

    @Test
    public void pickerReturnsBoundedContentUriAndImageToolReadsSyntheticBytes() {
        Intent result = new Intent()
            .setData(TestDocumentsProvider.INPUT_URI)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intending(hasAction(Intent.ACTION_OPEN_DOCUMENT)).respondWith(
            new Instrumentation.ActivityResult(Activity.RESULT_OK, result)
        );

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.navigate(scenario, "#/tool/image-compressor");
            WebViewTestHarness.waitForText(scenario, "Image Compressor");
            WebViewTestHarness.clickButton(scenario, "Choose image");
            WebViewTestHarness.waitForText(scenario, "Selected a");
            WebViewTestHarness.clickButton(scenario, "Compress image");
            WebViewTestHarness.waitForText(scenario, "1 by 1 pixels");

            intended(openDocumentRequest());
            assertTrue(
                WebViewTestHarness.evaluateBoolean(
                    scenario,
                    "document.querySelector('img[alt^=\"Compressed image preview\"]') !== null"
                )
            );
        }
    }

    @Test
    public void pickerAndSaveAsCancellationReturnNeutralRecoverableStates() {
        intending(hasAction(Intent.ACTION_OPEN_DOCUMENT)).respondWith(
            new Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null)
        );
        intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(
            new Instrumentation.ActivityResult(Activity.RESULT_CANCELED, null)
        );

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            WebViewTestHarness.navigate(scenario, "#/tool/image-compressor");
            WebViewTestHarness.waitForText(scenario, "Image Compressor");
            WebViewTestHarness.clickButton(scenario, "Choose image");
            WebViewTestHarness.waitForText(scenario, "No file selected.");

            prepareQr(scenario);
            WebViewTestHarness.clickButton(scenario, "Save PNG");
            WebViewTestHarness.waitForText(scenario, "Save cancelled.");

            intended(hasAction(Intent.ACTION_OPEN_DOCUMENT));
            intended(hasAction(Intent.ACTION_CREATE_DOCUMENT));
            waitForSaveCacheToEmpty();
        }
    }

    @Test
    public void saveAsWritesTheGeneratedPngAndRemovesItsPrivateHandoff() throws IOException {
        Intent result = new Intent()
            .setData(TestDocumentsProvider.OUTPUT_URI)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        intending(hasAction(Intent.ACTION_CREATE_DOCUMENT)).respondWith(
            new Instrumentation.ActivityResult(Activity.RESULT_OK, result)
        );

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            prepareQr(scenario);
            WebViewTestHarness.clickButton(scenario, "Save PNG");
            WebViewTestHarness.waitForText(scenario, "QR image saved.");

            intended(createDocumentRequest());
            byte[] saved = readUri(TestDocumentsProvider.OUTPUT_URI, testContext());
            assertTrue("Save As output must contain a non-empty PNG.", saved.length > PNG_SIGNATURE.length);
            assertArrayEquals(PNG_SIGNATURE, Arrays.copyOf(saved, PNG_SIGNATURE.length));
            waitForSaveCacheToEmpty();
        }
    }

    @Test
    public void shareUsesReadOnlyFileProviderGrantAndBytesRemainAvailableAfterReturn()
        throws IOException {
        AtomicReference<Uri> sharedUri = new AtomicReference<>();
        intending(shareChooserRequest(sharedUri)).respondWith(
            new Instrumentation.ActivityResult(Activity.RESULT_OK, new Intent())
        );

        try (ActivityScenario<MainActivity> scenario = WebViewTestHarness.launch()) {
            prepareQr(scenario);
            WebViewTestHarness.clickButton(scenario, "Share PNG");
            WebViewTestHarness.waitForText(scenario, "QR image shared.");

            intended(shareChooserRequest(new AtomicReference<>()));
            Uri uri = sharedUri.get();
            assertNotNull(uri);
            assertEquals("content", uri.getScheme());
            assertEquals(targetContext().getPackageName() + ".fileprovider", uri.getAuthority());
            byte[] shared = readUri(uri, targetContext());
            assertTrue("Share output must remain available for a lazy read.", shared.length > PNG_SIGNATURE.length);
            assertArrayEquals(PNG_SIGNATURE, Arrays.copyOf(shared, PNG_SIGNATURE.length));
            assertTrue(new File(targetContext().getCacheDir(), "share/qr-code.png").isFile());
        }
    }

    private void prepareQr(ActivityScenario<MainActivity> scenario) {
        WebViewTestHarness.navigate(scenario, "#/tool/qr-generator");
        WebViewTestHarness.waitForText(scenario, "QR Generator");
        WebViewTestHarness.setValue(scenario, "#qr-text", "synthetic-qr-fixture");
        WebViewTestHarness.waitForCondition(
            scenario,
            "document.querySelector('canvas') && document.querySelector('canvas').width > 0"
        );
    }

    private Matcher<Intent> openDocumentRequest() {
        return new TypeSafeDiagnosingMatcher<>() {
            @Override
            protected boolean matchesSafely(Intent intent, Description mismatch) {
                String[] mimeTypes = intent.getStringArrayExtra(Intent.EXTRA_MIME_TYPES);
                boolean valid =
                    Intent.ACTION_OPEN_DOCUMENT.equals(intent.getAction()) &&
                    intent.hasCategory(Intent.CATEGORY_OPENABLE) &&
                    "*/*".equals(intent.getType()) &&
                    !intent.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE, true) &&
                    (intent.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0 &&
                    mimeTypes != null &&
                    Arrays.asList(mimeTypes).containsAll(
                        Arrays.asList("image/png", "image/jpeg", "image/webp")
                    );
                if (!valid) mismatch.appendText("was not the bounded image picker request");
                return valid;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("bounded ACTION_OPEN_DOCUMENT image request");
            }
        };
    }

    private Matcher<Intent> createDocumentRequest() {
        return new TypeSafeDiagnosingMatcher<>() {
            @Override
            protected boolean matchesSafely(Intent intent, Description mismatch) {
                int grants = intent.getFlags();
                boolean valid =
                    Intent.ACTION_CREATE_DOCUMENT.equals(intent.getAction()) &&
                    intent.hasCategory(Intent.CATEGORY_OPENABLE) &&
                    "image/png".equals(intent.getType()) &&
                    "qr-code.png".equals(intent.getStringExtra(Intent.EXTRA_TITLE)) &&
                    (grants & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0 &&
                    (grants & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) != 0;
                if (!valid) mismatch.appendText("was not the scoped PNG Save As request");
                return valid;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("scoped ACTION_CREATE_DOCUMENT PNG request");
            }
        };
    }

    private Matcher<Intent> shareChooserRequest(AtomicReference<Uri> capturedUri) {
        return new TypeSafeDiagnosingMatcher<>() {
            @Override
            protected boolean matchesSafely(Intent chooser, Description mismatch) {
                Intent send = chooserIntent(chooser);
                Uri stream = send == null ? null : streamUri(send);
                boolean valid =
                    Intent.ACTION_CHOOSER.equals(chooser.getAction()) &&
                    send != null &&
                    Intent.ACTION_SEND.equals(send.getAction()) &&
                    "image/png".equals(send.getType()) &&
                    stream != null &&
                    (send.getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION) != 0 &&
                    (send.getFlags() & Intent.FLAG_GRANT_WRITE_URI_PERMISSION) == 0;
                if (valid && capturedUri.get() == null) capturedUri.set(stream);
                if (!valid) mismatch.appendText("was not a read-only PNG share chooser");
                return valid;
            }

            @Override
            public void describeTo(Description description) {
                description.appendText("ACTION_CHOOSER wrapping a read-only PNG ACTION_SEND");
            }
        };
    }

    private Intent chooserIntent(Intent chooser) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return chooser.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
        }
        return chooser.getParcelableExtra(Intent.EXTRA_INTENT);
    }

    private Uri streamUri(Intent send) {
        ClipData clipData = send.getClipData();
        if (clipData != null && clipData.getItemCount() == 1) {
            return clipData.getItemAt(0).getUri();
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return send.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
        }
        return send.getParcelableExtra(Intent.EXTRA_STREAM);
    }

    private byte[] readUri(Uri uri, Context context) throws IOException {
        try (
            InputStream input = context.getContentResolver().openInputStream(uri);
            ByteArrayOutputStream output = new ByteArrayOutputStream()
        ) {
            assertNotNull(input);
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }

    private void waitForSaveCacheToEmpty() {
        File save = new File(targetContext().getCacheDir(), "save");
        long deadline = SystemClock.uptimeMillis() + 5_000L;
        while (SystemClock.uptimeMillis() < deadline) {
            File[] children = save.listFiles();
            if (children == null || children.length == 0) return;
            SystemClock.sleep(50L);
        }
        File[] children = save.listFiles();
        assertTrue("Private Save As handoff must be removed.", children == null || children.length == 0);
    }

    private void deleteRecursively(File target) {
        File[] children = target.listFiles();
        if (children != null) {
            for (File child : children) deleteRecursively(child);
        }
        if (target.exists()) assertTrue("Synthetic cache fixture could not be removed.", target.delete());
    }

    private Context targetContext() {
        return InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    private Context testContext() {
        return InstrumentationRegistry.getInstrumentation().getContext();
    }
}
