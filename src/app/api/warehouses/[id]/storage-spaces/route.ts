import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createStorageSpace,
  listStorageSpacesByWarehouse,
} from "@/services/storage-space.service";
import { createStorageSpaceSchema } from "@/lib/validators/storage-space";

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

    const storageSpaces =
      await listStorageSpacesByWarehouse(warehouseId);

    return Response.json({
      data: storageSpaces,
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

    const result = createStorageSpaceSchema.safeParse({
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
            message: "Invalid storage space data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const storageSpace =
      await createStorageSpace(result.data);

    return Response.json(
      {
        data: storageSpace,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};