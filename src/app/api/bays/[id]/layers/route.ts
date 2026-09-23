import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createLayer,
  listLayersByBay,
} from "@/services/layer.service";
import { createLayerSchema } from "@/lib/validators/layer";

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

    const { id: bayId } = await context.params;

    const layers = await listLayersByBay(bayId);

    return Response.json({
      data: layers,
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

    const { id: bayId } = await context.params;

    const body: unknown = await request.json();

    const result = createLayerSchema.safeParse({
      ...(typeof body === "object" &&
      body !== null
        ? body
        : {}),
      bayId,
    });

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

    const layer = await createLayer(result.data);

    return Response.json(
      {
        data: layer,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
