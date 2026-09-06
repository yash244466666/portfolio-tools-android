package dev.yash.tools;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

final class GeneratedCachePolicy {

    static final int CONTRACT_VERSION = 1;
    static final long SHARE_RETENTION_MS = 6L * 60L * 60L * 1000L;
    static final long SAVE_RETENTION_MS = 1L * 60L * 60L * 1000L;
    static final int MAX_SHARE_DELETIONS_PER_PASS = 200;
    static final int MAX_SAVE_DELETIONS_PER_PASS = 50;
    static final long LOW_SPACE_BYTES = 64L * 1024L * 1024L;

    private GeneratedCachePolicy() {}

    /**
     * Selects the share files a cleanup pass may delete. Entries are existing regular files under
     * the app-owned cache/share/ subtree. Files with an unreadable modification time stay
     * protected so a lazily reading share target cannot lose its bytes mid-read; under low space
     * even fresh known files become eligible because retention must not outgrow the device.
     */
    static List<String> selectShareDeletions(List<CacheEntry> entries, long nowMs, boolean lowSpace) {
        List<CacheEntry> eligible = new ArrayList<>();
        for (CacheEntry entry : entries) {
            if (entry.lastModifiedMs > 0 &&
                (lowSpace || nowMs - entry.lastModifiedMs > SHARE_RETENTION_MS)) {
                eligible.add(entry);
            }
        }
        return oldestFirst(eligible, MAX_SHARE_DELETIONS_PER_PASS);
    }

    /**
     * Selects the Save As handoff directories a cleanup pass may delete. Only directories whose
     * name is a valid operation-owned identifier are ever eligible, so unrelated cache content is
     * never a deletion candidate, and the handoff of an active in-flight Save As operation is
     * always protected regardless of its age.
     */
    static List<String> selectSaveDeletions(List<CacheEntry> directories, long nowMs, boolean lowSpace) {
        List<CacheEntry> eligible = new ArrayList<>();
        for (CacheEntry directory : directories) {
            if (!DocumentFilePolicy.isValidOperationId(directory.name)) {
                continue;
            }
            if (GeneratedCacheRegistry.isActiveSaveOperation(directory.name)) {
                continue;
            }
            if (directory.lastModifiedMs > 0 &&
                (lowSpace || nowMs - directory.lastModifiedMs > SAVE_RETENTION_MS)) {
                eligible.add(directory);
            }
        }
        return oldestFirst(eligible, MAX_SAVE_DELETIONS_PER_PASS);
    }

    /**
     * Deterministic oldest-first order with a per-pass cap so one pass stays bounded even when a
     * long-lived session left many orphans behind; later passes continue where this one stopped.
     */
    private static List<String> oldestFirst(List<CacheEntry> eligible, int cap) {
        List<CacheEntry> ordered = new ArrayList<>(eligible);
        Collections.sort(
            ordered,
            Comparator.comparingLong((CacheEntry entry) -> entry.lastModifiedMs)
                .thenComparing((entry) -> entry.name)
        );
        List<String> selected = new ArrayList<>();
        for (CacheEntry entry : ordered) {
            if (selected.size() == cap) {
                break;
            }
            selected.add(entry.name);
        }
        return selected;
    }

    static final class CacheEntry {

        final String name;
        final long lastModifiedMs;
        final long sizeBytes;

        CacheEntry(String name, long lastModifiedMs, long sizeBytes) {
            this.name = name;
            this.lastModifiedMs = lastModifiedMs;
            this.sizeBytes = sizeBytes;
        }
    }
}