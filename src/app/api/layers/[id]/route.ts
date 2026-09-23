import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  deleteLayer,
  getLayerById,
  updateLayer,
} from "@/services/layer.service";
import { updateLayerSchema } from "@/lib/validators/layer";

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

    const layer = await getLayerById(id);

    return Response.json({
      data: layer,
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

    const result = updateLayerSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid layer data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const layer = await updateLayer(id, result.data);

    return Response.json({
      data: layer,
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

    const layer = await deleteLayer(id);

    return Response.json({
      data: layer,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
