import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { parseListQuery } from "@/lib/api/list-query";
import { requireAuth } from "@/lib/auth/authorization";
import {
  createItemSchema,
  listItemsQuerySchema,
} from "@/lib/validators/item";
import {
  createItem,
  listItems,
  listItemsPage,
} from "@/services/item.service";

export const GET = async (request: NextRequest) => {
  try {
    await requireAuth();

    const parsed = parseListQuery(
      request,
      listItemsQuerySchema,
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
      const items = await listItems();

      return Response.json({
        data: items,
      });
    }

    const page = await listItemsPage(parsed.query);

    return Response.json({
      data: page.items,
      pagination: page.pagination,
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