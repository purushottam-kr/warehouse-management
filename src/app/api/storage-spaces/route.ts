import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { parseListQuery } from "@/lib/api/list-query";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createStorageSpaceSchema,
  listStorageSpacesQuerySchema,
} from "@/lib/validators/storage-space";
import {
  createStorageSpace,
  listStorageSpaces,
  listStorageSpacesPage,
} from "@/services/storage-space.service";

export const GET = async (request: NextRequest) => {
  try {
    await requireAuth();

    const parsed = parseListQuery(
      request,
      listStorageSpacesQuerySchema,
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    /*
     * No query parameters: return the full unpaged
     * list. Option dropdowns rely on this; list pages
     * always send page/pageSize.
     */
    if (parsed.empty) {
      const storageSpaces = await listStorageSpaces();

      return Response.json({
        data: storageSpaces,
      });
    }

    const page = await listStorageSpacesPage(
      parsed.query,
    );

    return Response.json({
      data: page.storageSpaces,
      pagination: page.pagination,
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