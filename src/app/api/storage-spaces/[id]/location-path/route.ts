import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { getStorageSpaceLocationPath } from "@/services/storage-space.service";

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

    const path = await getStorageSpaceLocationPath(id);

    return Response.json({
      data: path,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
