import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth/authorization";
import { errorResponse } from "@/lib/api/error-response";
import { parseListQuery } from "@/lib/api/list-query";
import {
  createWarehouseSchema,
  listWarehousesQuerySchema,
} from "@/lib/validators/warehouse";
import {
  createWarehouse,
  listWarehouses,
  listWarehousesPage,
} from "@/services/warehouse.service";

export const GET = async (request: NextRequest) => {
  try {
    await requireAuth();

    const parsed = parseListQuery(
      request,
      listWarehousesQuerySchema,
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    /*
     * No query parameters: return the full unpaged
     * list. Option dropdowns rely on this; list pages
     * always send page/pageSize.
     */
    if (parsed.empty) {
      const warehouses = await listWarehouses();

      return Response.json({
        data: warehouses,
      });
    }

    const page = await listWarehousesPage(parsed.query);

    return Response.json({
      data: page.warehouses,
      pagination: page.pagination,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    await requireAuth();

    const body: unknown = await request.json();

    const result = createWarehouseSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid warehouse data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const warehouse = await createWarehouse(result.data);

    return Response.json(
      {
        data: warehouse,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};