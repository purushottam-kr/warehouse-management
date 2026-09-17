import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  deleteStorageSpace,
  getStorageSpaceById,
  updateStorageSpace,
} from "@/services/storage-space.service";
import { updateStorageSpaceSchema } from "@/lib/validators/storage-space";

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

    const storageSpace =
      await getStorageSpaceById(id);

    return Response.json({
      data: storageSpace,
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

    const result =
      updateStorageSpaceSchema.safeParse(body);

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
      await updateStorageSpace(id, result.data);

    return Response.json({
      data: storageSpace,
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

    const storageSpace =
      await deleteStorageSpace(id);

    return Response.json({
      data: storageSpace,
    });
  } catch (error) {
    return errorResponse(error);
  }
};