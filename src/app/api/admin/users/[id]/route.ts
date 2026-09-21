import { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { requirePermission } from "@/lib/auth/authorization";
import { updateUserSchema } from "@/lib/validators/user";
import { updateUser } from "@/services/user.service";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const PATCH = async (
  request: NextRequest,
  context: RouteContext,
) => {
  try {
    await requirePermission("USER_MANAGE");

    const { id } = await context.params;

    const body: unknown = await request.json();

    const result =
      updateUserSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid user data.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      );
    }

    const updatedUser = await updateUser(
      id,
      result.data,
    );

    return Response.json({
      data: updatedUser,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
