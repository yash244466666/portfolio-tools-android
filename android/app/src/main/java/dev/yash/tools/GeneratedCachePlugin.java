package dev.yash.tools;

import android.os.StatFs;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Deterministic, best-effort janitor for the two generated-file subtrees the app owns:
 * cache/share/ (Android share targets) and cache/save/&lt;operation-id&gt;/ (Save As handoffs).
 * It runs once per bridge load so orphans from process death or failed immediate cleanup are
 * recovered, and JS adapters may request additional passes opportunistically. It never touches
 * any other cache or user data, logs nothing about file names, and never deletes the handoff of
 * an active document operation.
 */
@CapacitorPlugin(name = "GeneratedCache")
public final class GeneratedCachePlugin extends Plugin {

    private static final String SHARE_DIRECTORY = "share";
    private static final String SAVE_DIRECTORY = "save";

    private final AtomicBoolean passInFlight = new AtomicBoolean(false);

    @Override
    public void load() {
        super.load();
        getBridge().execute(() -> runPass(null));
    }

    @PluginMethod
    public void cleanup(PluginCall call) {
        Object version = call.getData().opt("contractVersion");
        if (
            !(version instanceof Number) ||
            ((Number) version).doubleValue() != GeneratedCachePolicy.CONTRACT_VERSION
        ) {
            call.reject("The cleanup request version is unsupported.", "CACHE_CLEANUP_INVALID");
            return;
        }
        if (!passInFlight.compareAndSet(false, true)) {
            call.reject("A cleanup pass is already running.", "CACHE_CLEANUP_IN_PROGRESS");
            return;
        }
        getBridge().execute(() -> runPass(call));
    }

    private void runPass(PluginCall call) {
        JSObject result = null;
        try {
            result = executePass();
        } catch (RuntimeException ignored) {
            // The pass stays best-effort: a failure keeps existing files for the next pass.
        } finally {
            passInFlight.set(false);
        }
        if (call == null) {
            return;
        }
        final JSObject summary = result;
        getBridge().executeOnMainThread(() -> {
            if (summary == null) {
                call.reject("The generated-file cleanup pass failed.", "CACHE_CLEANUP_FAILED");
                return;
            }
            summary.put("contractVersion", GeneratedCachePolicy.CONTRACT_VERSION);
            call.resolve(summary);
        });
    }

    private JSObject executePass() {
        File cache = getContext().getCacheDir();
        boolean lowSpace = isLowSpace(cache);

        int deletedFiles = 0;
        long freedBytes = 0;
        File shareDirectory = new File(cache, SHARE_DIRECTORY);
        List<GeneratedCachePolicy.CacheEntry> shareEntries = listRegularFiles(shareDirectory);
        for (String name : GeneratedCachePolicy.selectShareDeletions(shareEntries, System.currentTimeMillis(), lowSpace)) {
            File target = validatedChild(shareDirectory, name);
            if (target != null && target.isFile()) {
                long size = target.length();
                if (target.delete()) {
                    deletedFiles++;
                    freedBytes += size;
                }
            }
        }

        int deletedDirectories = 0;
        File saveDirectory = new File(cache, SAVE_DIRECTORY);
        List<GeneratedCachePolicy.CacheEntry> saveEntries = listSaveOperations(saveDirectory);
        for (String name : GeneratedCachePolicy.selectSaveDeletions(saveEntries, System.currentTimeMillis(), lowSpace)) {
            File target = validatedChild(saveDirectory, name);
            if (target != null && target.isDirectory() && deleteRecursively(target)) {
                deletedDirectories++;
            }
        }

        JSObject summary = new JSObject();
        summary.put("deletedFiles", deletedFiles);
        summary.put("deletedDirectories", deletedDirectories);
        summary.put("freedBytes", freedBytes);
        return summary;
    }

    private boolean isLowSpace(File cache) {
        try {
            StatFs stat = new StatFs(cache.getAbsolutePath());
            long freeBytes = stat.getAvailableBytes();
            return freeBytes >= 0 && freeBytes < GeneratedCachePolicy.LOW_SPACE_BYTES;
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private List<GeneratedCachePolicy.CacheEntry> listRegularFiles(File directory) {
        List<GeneratedCachePolicy.CacheEntry> entries = new ArrayList<>();
        File[] children = directory.listFiles();
        if (children == null) {
            return entries;
        }
        for (File child : children) {
            if (child.isFile()) {
                entries.add(new GeneratedCachePolicy.CacheEntry(child.getName(), child.lastModified(), child.length()));
            }
        }
        return entries;
    }

    private List<GeneratedCachePolicy.CacheEntry> listSaveOperations(File directory) {
        List<GeneratedCachePolicy.CacheEntry> entries = new ArrayList<>();
        File[] children = directory.listFiles();
        if (children == null) {
            return entries;
        }
        for (File child : children) {
            // Active-operation protection lives in the policy so every selection path honors it.
            if (child.isDirectory()) {
                entries.add(new GeneratedCachePolicy.CacheEntry(child.getName(), child.lastModified(), child.length()));
            }
        }
        return entries;
    }

    /**
     * Canonical-path containment check. A deletion target is only ever cache/&lt;subtree&gt;/&lt;listed-name&gt;,
     * and any listed name that escapes its subtree through links or traversal is ignored.
     */
    private File validatedChild(File subtree, String name) {
        File target = new File(subtree, name);
        try {
            String subtreePath = subtree.getCanonicalPath() + File.separator;
            if (!target.getCanonicalPath().startsWith(subtreePath)) {
                return null;
            }
            return target;
        } catch (IOException ignored) {
            return null;
        }
    }

    private boolean deleteRecursively(File target) {
        File[] children = target.listFiles();
        if (children != null) {
            for (File child : children) {
                if (child.isDirectory()) {
                    deleteRecursively(child);
                } else if (!child.delete()) {
                    return false;
                }
            }
        }
        return target.delete();
    }
}