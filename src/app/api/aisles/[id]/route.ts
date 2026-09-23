import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  deleteAisle,
  getAisleById,
  updateAisle,
} from "@/services/aisle.service";
import { updateAisleSchema } from "@/lib/validators/aisle";

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

    const aisle = await getAisleById(id);

    return Response.json({
      data: aisle,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const PATCH = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requireAuth();

    const { id } = await context.params;

    const body: unknown = await request.json();

    const result = updateAisleSchema.safeParse(body);

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

    const aisle = await updateAisle(id, result.data);

    return Response.json({
      data: aisle,
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

    const aisle = await deleteAisle(id);

    return Response.json({
      data: aisle,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
