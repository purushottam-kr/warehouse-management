import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth/authorization";
import { errorResponse } from "@/lib/api/error-response";
import { createWarehouseSchema } from "@/lib/validators/warehouse";
import {
  createWarehouse,
  listWarehouses,
} from "@/services/warehouse.service";

export const GET = async () => {
  try {
    await requireAuth();

    const warehouses = await listWarehouses();

    return Response.json({
      data: warehouses,
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