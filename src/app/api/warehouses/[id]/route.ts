import { NextRequest } from "next/server";

import { requireAuth } from "@/lib/auth/authorization";
import { errorResponse } from "@/lib/api/error-response";
import { deleteWarehouse, getWarehouseById } from "@/services/warehouse.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const GET = async (
  _request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requireAuth();

    const { id } = await context.params;

    const warehouse = await getWarehouseById(id);

    return Response.json({
      data: warehouse,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

import { updateWarehouseSchema } from "@/lib/validators/warehouse";
import { updateWarehouse } from "@/services/warehouse.service";

export const PATCH = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requireAuth();

    const { id } = await context.params;

    const body: unknown = await request.json();

    const result = updateWarehouseSchema.safeParse(body);

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

    const warehouse = await updateWarehouse(
      id,
      result.data,
    );

    return Response.json({
      data: warehouse,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const DELETE = async (
  _request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requireAuth();

    const { id } = await context.params;

    const warehouse = await deleteWarehouse(id);

    return Response.json({
      data: warehouse,
    });
  } catch (error) {
    return errorResponse(error);
  }
};