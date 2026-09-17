import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import {
  deleteItem,
  getItemById,
  updateItem,
} from "@/services/item.service";
import { updateItemSchema } from "@/lib/validators/item";

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

    const item = await getItemById(id);

    return Response.json({
      data: item,
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
      updateItemSchema.safeParse(body);

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

    const item = await updateItem(
      id,
      result.data,
    );

    return Response.json({
      data: item,
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

    const item = await deleteItem(id);

    return Response.json({
      data: item,
    });
  } catch (error) {
    return errorResponse(error);
  }
};