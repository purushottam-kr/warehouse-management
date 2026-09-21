import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { listMovementsQuerySchema } from "@/lib/validators/inventory-movement";
import { listInventoryMovements } from "@/services/inventory-movement.service";

export const GET = async (
  request: NextRequest,
) => {
  try {
    await requireAuth();

    /*
     * Empty query-string values are dropped so the
     * schema treats them as absent instead of
     * failing uuid/enum validation.
     */
    const rawQuery = Object.fromEntries(
      request.nextUrl.searchParams.entries(),
    );

    const cleanedQuery = Object.fromEntries(
      Object.entries(rawQuery).filter(
        ([, value]) => value !== "",
      ),
    );

    const result =
      listMovementsQuerySchema.safeParse(
        cleanedQuery,
      );

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message:
              "Invalid movement query parameters.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const page = await listInventoryMovements(
      result.data,
    );

    return Response.json({
      data: page.movements,
      pagination: page.pagination,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
