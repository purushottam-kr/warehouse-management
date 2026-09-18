import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createStorageSpace,
  listStorageSpaces,
} from "@/services/storage-space.service";
import { createStorageSpaceSchema } from "@/lib/validators/storage-space";

export const GET = async () => {
  try {
    await requireAuth();

    const storageSpaces = await listStorageSpaces();

    return Response.json({
      data: storageSpaces,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST = async (request: NextRequest) => {
  try {
    await requireAuth();

    const body: unknown = await request.json();

    const result = createStorageSpaceSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid storage space data.",
            details: result.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const storageSpace = await createStorageSpace(result.data);

    return Response.json(
      {
        data: storageSpace,
      },
      { status: 201 },
    );
  } catch (error) {
    return errorResponse(error);
  }
};