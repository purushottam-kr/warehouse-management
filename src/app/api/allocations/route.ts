import { NextResponse } from "next/server";

import { createAllocationSchema } from "@/lib/validators/allocation";
import { allocateInventory } from "@/services/allocation.service";
import { getCurrentUser } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors/errors";

export const POST = async (request: Request) => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required.",
          },
        },
        { status: 401 },
      );
    }

    const body: unknown = await request.json();
    const input = createAllocationSchema.parse(body);

    const result = await allocateInventory(input, user.id);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode },
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred.",
        },
      },
      { status: 500 },
    );
  }
};