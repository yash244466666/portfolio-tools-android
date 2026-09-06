package dev.yash.tools;

import java.util.HashSet;
import java.util.Set;

/**
 * Process-local registry of Save As operations whose staged private-cache handoff is in flight.
 * The cleanup plugin consults it so an abandoned-file pass can never delete the handoff of a
 * document operation that is still open, including one whose system picker is showing.
 */
final class GeneratedCacheRegistry {

    private static final Set<String> ACTIVE_SAVE_OPERATIONS =
        java.util.Collections.synchronizedSet(new HashSet<>());

    private GeneratedCacheRegistry() {}

    static void beginSaveOperation(String operationId) {
        ACTIVE_SAVE_OPERATIONS.add(operationId);
    }

    static void endSaveOperation(String operationId) {
        if (operationId == null) {
            ACTIVE_SAVE_OPERATIONS.clear();
            return;
        }
        ACTIVE_SAVE_OPERATIONS.remove(operationId);
    }

    static boolean isActiveSaveOperation(String operationId) {
        return ACTIVE_SAVE_OPERATIONS.contains(operationId);
    }
}