import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { getItemAllocationSummary } from "@/services/allocation.service";

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

    const summary =
      await getItemAllocationSummary(id);

    return Response.json({
      data: summary,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
