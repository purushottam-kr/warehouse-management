import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { ITEM_IMPORT_MAX_BYTES } from "@/lib/csv/item-csv";
import { importItemsFromCsvText } from "@/services/item.service";

/*
 * POST /api/items/import (multipart/form-data, field "file").
 *
 * All-or-nothing transactional import: the whole file is
 * validated before any write, so a single invalid row means
 * zero rows are created. Row-level errors are reported with
 * 1-based CSV line numbers.
 */

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
]);

const MAX_BYTES_LABEL = "2 MB";

export const POST = async (request: NextRequest) => {
  try {
    await requireAuth();

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return Response.json(
        {
          error: {
            code: "INVALID_FILE_TYPE",
            message:
              "Expected a multipart upload with a CSV file field named “file”.",
          },
        },
        {
          status: 400,
        },
      );
    }

    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        {
          error: {
            code: "CSV_MISSING_FILE",
            message:
              "No file was uploaded. Choose a .csv file to import.",
          },
        },
        {
          status: 400,
        },
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return Response.json(
        {
          error: {
            code: "INVALID_FILE_TYPE",
            message:
              "Invalid file type. Upload a .csv file.",
          },
        },
        {
          status: 400,
        },
      );
    }

    /*
     * MIME types are advisory and OS-dependent, so an empty
     * type passes when the extension is .csv. Anything
     * explicitly non-CSV is rejected. Content is always
     * re-validated server-side after parsing.
     */
    if (
      file.type !== "" &&
      !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())
    ) {
      return Response.json(
        {
          error: {
            code: "INVALID_FILE_TYPE",
            message: `Unsupported media type “${file.type}”. Upload a .csv file.`,
          },
        },
        {
          status: 400,
        },
      );
    }

    if (file.size === 0) {
      return Response.json(
        {
          error: {
            code: "CSV_EMPTY_FILE",
            message:
              "The uploaded file is empty. Include a header row and at least one item.",
          },
        },
        {
          status: 400,
        },
      );
    }

    if (file.size > ITEM_IMPORT_MAX_BYTES) {
      return Response.json(
        {
          error: {
            code: "FILE_TOO_LARGE",
            message: `File is too large. Maximum size is ${MAX_BYTES_LABEL}.`,
          },
        },
        {
          status: 413,
        },
      );
    }

    const csvText = await file.text();

    const outcome =
      await importItemsFromCsvText(csvText);

    if (!outcome.ok) {
      return Response.json(
        {
          error: {
            code: "CSV_VALIDATION_ERROR",
            message: outcome.fileError,
            details: {
              created: outcome.created,
              rejected: outcome.rejected,
              errors: outcome.errors,
            },
          },
        },
        {
          status: 400,
        },
      );
    }

    return Response.json(
      {
        data: {
          created: outcome.created,
          rejected: outcome.rejected,
          errors: outcome.errors,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
