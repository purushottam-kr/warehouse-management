import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { AppError } from "@/lib/errors/errors";
import { createTransferSchema } from "@/lib/validators/transfer";
import { createTransferService } from "@/services/transfer.service";

const transferService = createTransferService();

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
    const input = createTransferSchema.parse(body);

    const result = await transferService.transferInventory(
      input,
      user.id,
    );

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