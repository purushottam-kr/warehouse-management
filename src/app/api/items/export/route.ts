import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  buildItemsExportFilename,
  serializeItemsToCsv,
} from "@/lib/csv/item-csv";
import { exportItemsQuerySchema } from "@/lib/validators/item";
import { exportItems } from "@/services/item.service";

/*
 * GET /api/items/export?search=&warehouseId=&storageSpaceId=
 *
 * Streams the filtered item list as a UTF-8 CSV attachment.
 * Same filter semantics as GET /api/items, never paginated.
 */
export const GET = async (request: NextRequest) => {
  try {
    await requireAuth();

    const rawParams = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    /*
     * Pagination params are ignored (not rejected) so the
     * client can forward its current list-query state as-is.
     */
    const { page, pageSize, ...filters } = rawParams;

    void page;
    void pageSize;

    const cleanedFilters = Object.fromEntries(
      Object.entries(filters).filter(
        ([, value]) => value !== "",
      ),
    );

    const result =
      exportItemsQuerySchema.safeParse(cleanedFilters);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid export filters.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const items = await exportItems(result.data);
    const csv = serializeItemsToCsv(items);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${buildItemsExportFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
};
