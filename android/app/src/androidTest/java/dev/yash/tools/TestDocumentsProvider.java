package dev.yash.tools;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import android.util.Base64;
import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.IOException;

/** Test-APK-only content provider backed by two synthetic private files. */
public final class TestDocumentsProvider extends ContentProvider {

    static final String AUTHORITY = "dev.yash.tools.test.documents";
    static final Uri INPUT_URI = Uri.parse("content://" + AUTHORITY + "/input");
    static final Uri OUTPUT_URI = Uri.parse("content://" + AUTHORITY + "/output");

    private static final byte[] INPUT_PNG = Base64.decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        Base64.DEFAULT
    );

    @Override
    public boolean onCreate() {
        try {
            writeInputFixture();
            return true;
        } catch (IOException ignored) {
            return false;
        }
    }

    @Override
    public Cursor query(
        Uri uri,
        String[] projection,
        String selection,
        String[] selectionArgs,
        String sortOrder
    ) {
        String[] columns = projection == null
            ? new String[] { OpenableColumns.DISPLAY_NAME, OpenableColumns.SIZE }
            : projection;
        MatrixCursor cursor = new MatrixCursor(columns, 1);
        Object[] row = new Object[columns.length];
        File file = fileFor(uri);
        for (int index = 0; index < columns.length; index++) {
            if (OpenableColumns.DISPLAY_NAME.equals(columns[index])) {
                row[index] = INPUT_URI.equals(uri) ? "fixture.png" : "qr-output.png";
            } else if (OpenableColumns.SIZE.equals(columns[index])) {
                row[index] = file.isFile() ? file.length() : 0L;
            }
        }
        cursor.addRow(row);
        return cursor;
    }

    @Override
    public String getType(Uri uri) {
        return "image/png";
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode) throws FileNotFoundException {
        File file = fileFor(uri);
        if (INPUT_URI.equals(uri)) {
            try {
                writeInputFixture();
            } catch (IOException error) {
                FileNotFoundException failure = new FileNotFoundException(
                    "Synthetic input fixture is unavailable."
                );
                failure.initCause(error);
                throw failure;
            }
        }
        return ParcelFileDescriptor.open(file, ParcelFileDescriptor.parseMode(mode));
    }

    @Override
    public int delete(Uri uri, String selection, String[] selectionArgs) {
        File file = fileFor(uri);
        return file.delete() ? 1 : 0;
    }

    @Override
    public Uri insert(Uri uri, ContentValues values) {
        throw new UnsupportedOperationException("Synthetic provider does not insert rows.");
    }

    @Override
    public int update(Uri uri, ContentValues values, String selection, String[] selectionArgs) {
        throw new UnsupportedOperationException("Synthetic provider does not update rows.");
    }

    private File fileFor(Uri uri) {
        if (!INPUT_URI.equals(uri) && !OUTPUT_URI.equals(uri)) {
            throw new IllegalArgumentException("Unknown synthetic document URI.");
        }
        File root = new File(getContext().getCacheDir(), "documents");
        if (!root.exists() && !root.mkdirs()) {
            throw new IllegalStateException("Synthetic document directory is unavailable.");
        }
        return new File(root, INPUT_URI.equals(uri) ? "input.png" : "output.png");
    }

    private void writeInputFixture() throws IOException {
        File input = fileFor(INPUT_URI);
        try (FileOutputStream output = new FileOutputStream(input, false)) {
            output.write(INPUT_PNG);
        }
    }
}
