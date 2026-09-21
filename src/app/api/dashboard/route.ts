import { errorResponse } from "@/lib/api/error-response";
import { requireAuth } from "@/lib/auth/authorization";
import { getDashboardOverview } from "@/services/dashboard.service";

export const GET = async () => {
  try {
    await requireAuth();

    const overview = await getDashboardOverview();

    return Response.json({
      data: overview,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
