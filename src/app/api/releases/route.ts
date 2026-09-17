import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { releaseInventorySchema } from "@/lib/validators/release";
import { createReleaseService } from "@/services/release.service";

const releaseService = createReleaseService();

export const POST = async (
  request: NextRequest,
) => {
  try {
    const user = await requireAuth();

    const body: unknown =
      await request.json();

    const result =
      releaseInventorySchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid release data.",
            details: result.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const release =
      await releaseService.releaseInventory(
        result.data,
        user.id,
      );

    return Response.json(
      {
        data: release,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
};