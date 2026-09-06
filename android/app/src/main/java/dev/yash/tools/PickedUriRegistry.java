package dev.yash.tools;

import java.util.HashSet;
import java.util.Set;

/**
 * Process-local registry of content URIs this app's picker returned. Content read/digest
 * operations accept only registered URIs, so the document bridge can never be used to read an
 * arbitrary provider URI that the user did not select inside the app. Entries are process-scoped;
 * a grant that does not survive process recreation surfaces as a typed read failure.
 */
final class PickedUriRegistry {

    private static final Set<String> PICKED_URIS =
        java.util.Collections.synchronizedSet(new HashSet<>());

    private PickedUriRegistry() {}

    static void remember(String uri) {
        PICKED_URIS.add(uri);
    }

    static boolean isPicked(String uri) {
        return PICKED_URIS.contains(uri);
    }

    static void clear() {
        PICKED_URIS.clear();
    }
}