import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { getStorageSpaceInventory } from "@/services/allocation.service";

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
    const inventory = await getStorageSpaceInventory(id);

    return Response.json({
      data: inventory,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
