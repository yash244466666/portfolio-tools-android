package dev.yash.tools;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.junit.Test;

public class GeneratedCachePolicyTest {

    private static final long NOW = 1_000_000_000L;
    private static final GeneratedCachePolicy.CacheEntry FRESH_SHARE =
        new GeneratedCachePolicy.CacheEntry("fresh.txt", NOW - 1_000L, 128L);
    private static final GeneratedCachePolicy.CacheEntry ABANDONED_SHARE =
        new GeneratedCachePolicy.CacheEntry("abandoned.txt", NOW - GeneratedCachePolicy.SHARE_RETENTION_MS - 1_000L, 256L);

    @Test
    public void keepsFreshShareFilesAndCleansAbandonedOnes() {
        List<String> selected = GeneratedCachePolicy.selectShareDeletions(
            Arrays.asList(FRESH_SHARE, ABANDONED_SHARE),
            NOW,
            false
        );
        assertEquals(Arrays.asList("abandoned.txt"), selected);
    }

    @Test
    public void keepsFilesWithUnreadableModificationTimes() {
        List<String> selected = GeneratedCachePolicy.selectShareDeletions(
            Arrays.asList(
                new GeneratedCachePolicy.CacheEntry("unknown.txt", 0L, 10L),
                new GeneratedCachePolicy.CacheEntry("negative.txt", -5L, 10L)
            ),
            NOW,
            false
        );
        assertTrue(selected.isEmpty());
    }

    @Test
    public void treatsLowSpaceAsImmediateEligibility() {
        List<String> selected = GeneratedCachePolicy.selectShareDeletions(
            Arrays.asList(FRESH_SHARE, new GeneratedCachePolicy.CacheEntry("unknown.txt", 0L, 10L)),
            NOW,
            true
        );
        assertEquals(Arrays.asList("fresh.txt"), selected);
    }

    @Test
    public void deletesOnlyOperationOwnedSaveDirectories() {
        String oldOperation = "123e4567-e89b-42d3-a456-426614174000";
        List<GeneratedCachePolicy.CacheEntry> directories = Arrays.asList(
            new GeneratedCachePolicy.CacheEntry(oldOperation, NOW - GeneratedCachePolicy.SAVE_RETENTION_MS - 1_000L, 512L),
            new GeneratedCachePolicy.CacheEntry("not-a-uuid", 0L, 512L),
            new GeneratedCachePolicy.CacheEntry("unrelated-directory", 0L, 512L)
        );
        List<String> selected = GeneratedCachePolicy.selectSaveDeletions(directories, NOW, false);
        assertEquals(Arrays.asList(oldOperation), selected);
    }

    @Test
    public void keepsSaveHandoffsInsideTheSaveRetentionWindow() {
        String freshOperation = "123e4567-e89b-42d3-a456-426614174001";
        List<String> selected = GeneratedCachePolicy.selectSaveDeletions(
            Arrays.asList(new GeneratedCachePolicy.CacheEntry(freshOperation, NOW - 1_000L, 512L)),
            NOW,
            false
        );
        assertTrue(selected.isEmpty());
    }

    @Test
    public void boundsEachPassWithDeterministicOldestFirstOrdering() {
        List<GeneratedCachePolicy.CacheEntry> entries = new ArrayList<>();
        for (int index = 0; index < GeneratedCachePolicy.MAX_SHARE_DELETIONS_PER_PASS + 10; index++) {
            // Strictly decreasing modification times make the oldest-first order unambiguous.
            long age = GeneratedCachePolicy.SHARE_RETENTION_MS + 1_000L + index;
            entries.add(new GeneratedCachePolicy.CacheEntry("orphan-" + index + ".txt", NOW - age, 8L));
        }
        List<String> selected = GeneratedCachePolicy.selectShareDeletions(entries, NOW, false);
        assertEquals(GeneratedCachePolicy.MAX_SHARE_DELETIONS_PER_PASS, selected.size());
        // The newest orphan stays for a later pass; the ten oldest orphans are deleted first.
        assertFalse(selected.contains("orphan-0.txt"));
        assertTrue(selected.contains("orphan-209.txt"));
        assertTrue(selected.contains("orphan-200.txt"));
        assertFalse(selected.contains("orphan-9.txt"));
        assertEquals(selected, GeneratedCachePolicy.selectShareDeletions(entries, NOW, false));
    }

    @Test
    public void usesDistinctRetentionWindowsForShareAndSave() {
        assertTrue(GeneratedCachePolicy.SHARE_RETENTION_MS > GeneratedCachePolicy.SAVE_RETENTION_MS);
        assertEquals(1, GeneratedCachePolicy.CONTRACT_VERSION);
    }

    @Test
    public void protectsActiveSaveOperationsFromCleanup() {
        GeneratedCacheRegistry.beginSaveOperation("123e4567-e89b-42d3-a456-426614174002");
        try {
            List<GeneratedCachePolicy.CacheEntry> directories = Arrays.asList(
                new GeneratedCachePolicy.CacheEntry(
                    "123e4567-e89b-42d3-a456-426614174002",
                    NOW - GeneratedCachePolicy.SAVE_RETENTION_MS - 1_000L,
                    512L
                ),
                new GeneratedCachePolicy.CacheEntry(
                    "123e4567-e89b-42d3-a456-426614174003",
                    NOW - GeneratedCachePolicy.SAVE_RETENTION_MS - 1_000L,
                    512L
                )
            );
            List<String> selected = GeneratedCachePolicy.selectSaveDeletions(directories, NOW, false);
            // The active in-flight operation is excluded before selection; only the abandoned one remains.
            assertEquals(Arrays.asList("123e4567-e89b-42d3-a456-426614174003"), selected);
        } finally {
            GeneratedCacheRegistry.endSaveOperation("123e4567-e89b-42d3-a456-426614174002");
        }
        assertFalse(GeneratedCacheRegistry.isActiveSaveOperation("123e4567-e89b-42d3-a456-426614174002"));
    }
}