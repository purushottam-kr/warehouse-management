import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createBay,
  listBaysByAisle,
} from "@/services/bay.service";
import { createBaySchema } from "@/lib/validators/bay";

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

    const { id: aisleId } = await context.params;

    const bays = await listBaysByAisle(aisleId);

    return Response.json({
      data: bays,
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

    const { id: aisleId } = await context.params;

    const body: unknown = await request.json();

    const result = createBaySchema.safeParse({
      ...(typeof body === "object" &&
      body !== null
        ? body
        : {}),
      aisleId,
    });

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid bay data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const bay = await createBay(result.data);

    return Response.json(
      {
        data: bay,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};
