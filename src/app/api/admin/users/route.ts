import { errorResponse } from "@/lib/api/error-response";
import { requirePermission } from "@/lib/auth/authorization";
import { listUsers } from "@/services/user.service";

export const GET = async () => {
  try {
    await requirePermission("USER_MANAGE");

    const users = await listUsers();

    return Response.json({
      data: users,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
