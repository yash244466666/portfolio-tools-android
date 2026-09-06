package dev.yash.tools;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.res.AssetFileDescriptor;
import android.database.Cursor;
import android.net.Uri;
import android.provider.DocumentsContract;
import android.provider.OpenableColumns;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@CapacitorPlugin(name = "DocumentFiles")
public final class DocumentFilesPlugin extends Plugin {

    private static final String ERROR_INVALID_ARGUMENT = "FILE_INVALID_ARGUMENT";
    private static final String ERROR_IN_PROGRESS = "FILE_OPERATION_IN_PROGRESS";
    private static final String ERROR_PICK_CANCELLED = "FILE_PICK_CANCELLED";
    private static final String ERROR_PICK_FAILED = "FILE_PICK_FAILED";
    private static final String ERROR_SAVE_CANCELLED = "FILE_SAVE_CANCELLED";
    private static final String ERROR_SAVE_FAILED = "FILE_SAVE_FAILED";
    private static final String ERROR_TOO_LARGE = "FILE_TOO_LARGE";
    private static final String SAVE_CACHE_DIRECTORY = "save";

    private final Object operationLock = new Object();
    private String activeOperationId;

    @PluginMethod
    public void pickDocuments(PluginCall call) {
        if (!hasCurrentContract(call)) {
            reject(call, ERROR_INVALID_ARGUMENT, "The document picker request version is unsupported.");
            return;
        }
        String operationId = call.getString("operationId");
        Object multipleValue = call.getData().opt("multiple");
        List<String> acceptedTypes = acceptedMimeTypes(call);
        Long requestedMaximum = numberAsLong(call.getData().opt("maximumBytes"));
        final long maximumBytes;
        try {
            maximumBytes = DocumentFilePolicy.validateMaximumPickBytes(requestedMaximum);
        } catch (IllegalArgumentException ignored) {
            reject(call, ERROR_INVALID_ARGUMENT, "The document picker size limit is invalid.");
            return;
        }
        if (!DocumentFilePolicy.isValidOperationId(operationId) || acceptedTypes == null || !(multipleValue instanceof Boolean)) {
            reject(call, ERROR_INVALID_ARGUMENT, "The document picker request is invalid.");
            return;
        }
        if (!beginOperation(operationId)) {
            reject(call, ERROR_IN_PROGRESS, "Another document request is already open.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if (acceptedTypes.size() == 1) {
            intent.setType(acceptedTypes.get(0));
        } else {
            intent.setType("*/*");
            intent.putExtra(Intent.EXTRA_MIME_TYPES, acceptedTypes.toArray(new String[0]));
        }
        boolean multiple = (Boolean) multipleValue;
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, multiple);

        call.getData().put("maximumBytes", maximumBytes);
        try {
            startActivityForResult(call, intent, "handlePickDocumentsResult");
        } catch (ActivityNotFoundException | SecurityException exception) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_FAILED, "The system document picker is unavailable.");
        }
    }

    @ActivityCallback
    private void handlePickDocumentsResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            finishOperation(null);
            return;
        }
        String operationId = call.getString("operationId");
        if (result.getResultCode() != Activity.RESULT_OK) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_CANCELLED, "No document was selected.");
            return;
        }
        Intent data = result.getData();
        Object multipleValue = call.getData().opt("multiple");
        List<Uri> uris = selectedUris(data);
        if (!(multipleValue instanceof Boolean)) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_FAILED, "The document picker request was interrupted.");
            return;
        }
        boolean multiple = (Boolean) multipleValue;
        if (uris.isEmpty() || uris.size() > (multiple ? DocumentFilePolicy.MAX_PICKED_DOCUMENTS : 1)) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_FAILED, "The document picker returned an invalid selection.");
            return;
        }

        getBridge().execute(() -> completePickDocuments(call, operationId, uris));
    }

    private void completePickDocuments(PluginCall call, String operationId, List<Uri> uris) {
        List<String> acceptedTypes = acceptedMimeTypes(call);
        Long requestedMaximum = numberAsLong(call.getData().opt("maximumBytes"));
        if (!hasCurrentContract(call) || !DocumentFilePolicy.isValidOperationId(operationId) || acceptedTypes == null) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_FAILED, "The document picker request was interrupted.");
            return;
        }
        final long maximumBytes;
        try {
            maximumBytes = DocumentFilePolicy.validateMaximumPickBytes(requestedMaximum);
        } catch (IllegalArgumentException ignored) {
            finishOperation(operationId);
            reject(call, ERROR_PICK_FAILED, "The document picker request was interrupted.");
            return;
        }

        JSArray files = new JSArray();
        for (Uri uri : uris) {
            DocumentMetadata metadata = readMetadata(uri, acceptedTypes);
            if (metadata == null) {
                finishOperation(operationId);
                reject(call, ERROR_PICK_FAILED, "The selected document metadata is unavailable.");
                return;
            }
            if (metadata.size > maximumBytes) {
                finishOperation(operationId);
                reject(call, ERROR_TOO_LARGE, "The selected document exceeds the allowed size.");
                return;
            }
            JSObject file = new JSObject();
            file.put("name", metadata.name);
            file.put("mimeType", metadata.mimeType);
            file.put("size", metadata.size);
            file.put("uri", uri.toString());
            files.put(file);
        }

        JSObject response = new JSObject();
        response.put("contractVersion", DocumentFilePolicy.CONTRACT_VERSION);
        response.put("operationId", operationId);
        response.put("files", files);
        finishOperation(operationId);
        resolve(call, response);
    }

    @PluginMethod
    public void saveDocument(PluginCall call) {
        SaveRequest request = validatedSaveRequest(call);
        if (request == null) {
            reject(call, ERROR_INVALID_ARGUMENT, "The Save As request is invalid.");
            return;
        }
        if (!beginOperation(request.operationId)) {
            reject(call, ERROR_IN_PROGRESS, "Another document request is already open.");
            return;
        }
        GeneratedCacheRegistry.beginSaveOperation(request.operationId);
        File source = resolveSaveSource(request);
        if (source == null || !source.isFile() || source.length() != request.size) {
            finishOperation(request.operationId);
            deleteSaveSource(request);
            reject(call, ERROR_SAVE_FAILED, "The generated document is unavailable.");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        intent.setType(request.mimeType);
        intent.putExtra(Intent.EXTRA_TITLE, request.name);
        try {
            startActivityForResult(call, intent, "handleSaveDocumentResult");
        } catch (ActivityNotFoundException | SecurityException exception) {
            finishOperation(request.operationId);
            deleteSaveSource(request);
            reject(call, ERROR_SAVE_FAILED, "The system Save As picker is unavailable.");
        }
    }

    @ActivityCallback
    private void handleSaveDocumentResult(PluginCall call, ActivityResult result) {
        if (call == null) {
            finishOperation(null);
            return;
        }
        SaveRequest request = validatedSaveRequest(call);
        if (request == null) {
            finishOperation(call.getString("operationId"));
            reject(call, ERROR_SAVE_FAILED, "The Save As request was interrupted.");
            return;
        }
        if (result.getResultCode() != Activity.RESULT_OK) {
            finishOperation(request.operationId);
            deleteSaveSource(request);
            reject(call, ERROR_SAVE_CANCELLED, "Save cancelled.");
            return;
        }
        Intent data = result.getData();
        Uri destination = data == null ? null : data.getData();
        if (destination == null || !ContentResolver.SCHEME_CONTENT.equals(destination.getScheme())) {
            finishOperation(request.operationId);
            deleteSaveSource(request);
            reject(call, ERROR_SAVE_FAILED, "The Save As picker returned an invalid destination.");
            return;
        }

        getBridge().execute(() -> completeSaveDocument(call, request, destination));
    }

    private void completeSaveDocument(PluginCall call, SaveRequest request, Uri destination) {
        File source = resolveSaveSource(request);
        boolean success = false;
        if (source != null && source.isFile() && source.length() == request.size) {
            success = copyToDestination(source, destination, request.size);
        }
        if (!success) {
            deleteIncompleteDocument(destination);
        }
        deleteSaveSource(request);
        finishOperation(request.operationId);
        if (success) {
            resolve(call, null);
        } else {
            reject(call, ERROR_SAVE_FAILED, "The document could not be saved.");
        }
    }

    @PluginMethod
    public void discardSave(PluginCall call) {
        SaveRequest request = validatedSaveRequest(call);
        if (request == null) {
            reject(call, ERROR_INVALID_ARGUMENT, "The cache cleanup request is invalid.");
            return;
        }
        synchronized (operationLock) {
            if (request.operationId.equals(activeOperationId)) {
                reject(call, ERROR_IN_PROGRESS, "The document is still being saved.");
                return;
            }
        }
        deleteSaveSource(request);
        resolve(call, null);
    }

    @Override
    protected void handleOnDestroy() {
        super.handleOnDestroy();
        finishOperation(null);
    }

    private boolean hasCurrentContract(PluginCall call) {
        Object value = call.getData().opt("contractVersion");
        return value instanceof Number && ((Number) value).doubleValue() == DocumentFilePolicy.CONTRACT_VERSION;
    }

    private List<String> acceptedMimeTypes(PluginCall call) {
        JSArray accept = call.getArray("accept");
        if (accept == null || accept.length() == 0 || accept.length() > DocumentFilePolicy.MAX_ACCEPT_TYPES) {
            return null;
        }
        Set<String> unique = new LinkedHashSet<>();
        for (int index = 0; index < accept.length(); index++) {
            Object value = accept.opt(index);
            if (!(value instanceof String)) {
                return null;
            }
            String mimeType = ((String) value).toLowerCase(Locale.ROOT);
            if (!DocumentFilePolicy.isValidMimeType(mimeType, true)) {
                return null;
            }
            unique.add(mimeType);
        }
        return new ArrayList<>(unique);
    }

    private SaveRequest validatedSaveRequest(PluginCall call) {
        if (!hasCurrentContract(call)) {
            return null;
        }
        String operationId = call.getString("operationId");
        String name = call.getString("name");
        String mimeType = call.getString("mimeType");
        Long size = numberAsLong(call.getData().opt("size"));
        if (
            !DocumentFilePolicy.isValidOperationId(operationId) ||
            name == null ||
            !name.equals(DocumentFilePolicy.sanitizeFileName(name)) ||
            !DocumentFilePolicy.isValidMimeType(mimeType, false) ||
            size == null ||
            size < 0 ||
            size > DocumentFilePolicy.MAX_SAVE_BYTES
        ) {
            return null;
        }
        return new SaveRequest(operationId, name, mimeType, size);
    }

    private static Long numberAsLong(Object value) {
        if (!(value instanceof Number)) {
            return null;
        }
        Number number = (Number) value;
        double asDouble = number.doubleValue();
        long asLong = number.longValue();
        return Double.isFinite(asDouble) && asDouble == asLong ? asLong : null;
    }

    private boolean beginOperation(String operationId) {
        synchronized (operationLock) {
            if (activeOperationId != null) {
                return false;
            }
            activeOperationId = operationId;
            return true;
        }
    }

    private void finishOperation(String operationId) {
        synchronized (operationLock) {
            if (operationId == null || operationId.equals(activeOperationId)) {
                activeOperationId = null;
            }
        }
        // Save As operations stage a private-cache handoff; the cleanup janitor must never treat
        // an operation as abandoned while it is still open. A null id clears every registration.
        GeneratedCacheRegistry.endSaveOperation(operationId);
    }

    private List<Uri> selectedUris(Intent data) {
        Set<String> unique = new LinkedHashSet<>();
        if (data != null && data.getClipData() != null) {
            ClipData clipData = data.getClipData();
            if (clipData.getItemCount() > DocumentFilePolicy.MAX_PICKED_DOCUMENTS) {
                return new ArrayList<>();
            }
            int count = clipData.getItemCount();
            for (int index = 0; index < count; index++) {
                Uri uri = clipData.getItemAt(index).getUri();
                if (uri == null || !ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
                    return new ArrayList<>();
                }
                unique.add(uri.toString());
            }
        } else if (data != null && data.getData() != null) {
            Uri uri = data.getData();
            if (ContentResolver.SCHEME_CONTENT.equals(uri.getScheme())) {
                unique.add(uri.toString());
            }
        }
        List<Uri> result = new ArrayList<>();
        for (String value : unique) {
            result.add(Uri.parse(value));
        }
        return result;
    }

    private DocumentMetadata readMetadata(Uri uri, List<String> acceptedTypes) {
        ContentResolver resolver = getContext().getContentResolver();
        String name = null;
        long size = -1;
        try (
            Cursor cursor = resolver.query(
                uri,
                new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE },
                null,
                null,
                null
            )
        ) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameColumn = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                int sizeColumn = cursor.getColumnIndex(OpenableColumns.SIZE);
                if (nameColumn >= 0 && !cursor.isNull(nameColumn)) {
                    name = cursor.getString(nameColumn);
                }
                if (sizeColumn >= 0 && !cursor.isNull(sizeColumn)) {
                    size = cursor.getLong(sizeColumn);
                }
            }
        } catch (RuntimeException ignored) {
            return null;
        }
        if (size < 0) {
            try (AssetFileDescriptor descriptor = resolver.openAssetFileDescriptor(uri, "r")) {
                size = descriptor == null ? -1 : descriptor.getLength();
            } catch (IOException | RuntimeException ignored) {
                return null;
            }
        }
        if (size < 0) {
            return null;
        }

        String mimeType;
        try {
            mimeType = resolver.getType(uri);
        } catch (RuntimeException ignored) {
            return null;
        }
        if (mimeType == null) {
            if (!acceptedTypes.contains("*/*")) {
                return null;
            }
            mimeType = "application/octet-stream";
        } else {
            mimeType = mimeType.toLowerCase(Locale.ROOT);
        }
        boolean accepted = false;
        for (String expected : acceptedTypes) {
            if (DocumentFilePolicy.mimeTypeMatches(expected, mimeType)) {
                accepted = true;
                break;
            }
        }
        if (!accepted) {
            return null;
        }
        return new DocumentMetadata(DocumentFilePolicy.sanitizeFileName(name), mimeType, size);
    }

    private File resolveSaveSource(SaveRequest request) {
        File root = new File(getContext().getCacheDir(), SAVE_CACHE_DIRECTORY);
        File operationDirectory = new File(root, request.operationId);
        File source = new File(operationDirectory, request.name);
        try {
            String operationPath = operationDirectory.getCanonicalPath() + File.separator;
            String sourcePath = source.getCanonicalPath();
            if (!sourcePath.startsWith(operationPath)) {
                return null;
            }
            return source;
        } catch (IOException ignored) {
            return null;
        }
    }

    private boolean copyToDestination(File source, Uri destination, long expectedSize) {
        ContentResolver resolver = getContext().getContentResolver();
        long written = 0;
        byte[] buffer = new byte[64 * 1024];
        try (
            InputStream input = new FileInputStream(source);
            OutputStream output = resolver.openOutputStream(destination, DocumentFilePolicy.SAVE_OUTPUT_MODE)
        ) {
            if (output == null) {
                return false;
            }
            int count;
            while ((count = input.read(buffer)) != -1) {
                written += count;
                if (written > DocumentFilePolicy.MAX_SAVE_BYTES || written > expectedSize) {
                    return false;
                }
                output.write(buffer, 0, count);
            }
            output.flush();
            return written == expectedSize;
        } catch (IOException | SecurityException ignored) {
            return false;
        }
    }

    private void deleteIncompleteDocument(Uri destination) {
        try {
            DocumentsContract.deleteDocument(getContext().getContentResolver(), destination);
        } catch (Exception ignored) {
            // The provider may not support deletion. The caller still receives a typed write failure.
        }
    }

    private void deleteSaveSource(SaveRequest request) {
        File source = resolveSaveSource(request);
        if (source != null && source.isFile()) {
            source.delete();
            File parent = source.getParentFile();
            if (parent != null) {
                parent.delete();
            }
        }
    }

    private void resolve(PluginCall call, JSObject data) {
        getBridge().executeOnMainThread(() -> {
            if (data == null) {
                call.resolve();
            } else {
                call.resolve(data);
            }
        });
    }

    private void reject(PluginCall call, String code, String message) {
        getBridge().executeOnMainThread(() -> call.reject(message, code));
    }

    private static final class DocumentMetadata {

        final String name;
        final String mimeType;
        final long size;

        DocumentMetadata(String name, String mimeType, long size) {
            this.name = name;
            this.mimeType = mimeType;
            this.size = size;
        }
    }

    private static final class SaveRequest {

        final String operationId;
        final String name;
        final String mimeType;
        final long size;

        SaveRequest(String operationId, String name, String mimeType, long size) {
            this.operationId = operationId;
            this.name = name;
            this.mimeType = mimeType;
            this.size = size;
        }
    }
}
