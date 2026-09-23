import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createAisle,
  listAislesByWarehouse,
} from "@/services/aisle.service";
import { createAisleSchema } from "@/lib/validators/aisle";

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

    const { id: warehouseId } = await context.params;

    const aisles =
      await listAislesByWarehouse(warehouseId);

    return Response.json({
      data: aisles,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requireAuth();

    const { id: warehouseId } = await context.params;

    const body: unknown = await request.json();

    const result = createAisleSchema.safeParse({
      ...(typeof body === "object" &&
      body !== null
        ? body
        : {}),
      warehouseId,
    });

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid aisle data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const aisle = await createAisle(result.data);

    return Response.json(
      {
        data: aisle,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
