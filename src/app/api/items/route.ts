import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createItem,
  listItems,
} from "@/services/item.service";
import { createItemSchema } from "@/lib/validators/item";

export const GET = async (
  _request: NextRequest,
) => {
  try {
    await requireAuth();

    const items = await listItems();

    return Response.json({
      data: items,
    });
  } catch (error) {
    return errorResponse(error);
  }
};

export const POST = async (
  request: NextRequest,
) => {
  try {
    await requireAuth();

    const body: unknown = await request.json();

    const result =
      createItemSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid item data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const item = await createItem(result.data);

    return Response.json(
      {
        data: item,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
};