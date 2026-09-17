import { NextResponse } from "next/server";

import { loginUser } from "@/lib/auth/auth";
import { loginSchema } from "@/lib/validators/auth";

export const POST = async (request: Request) => {
  try {
    const body: unknown = await request.json();

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid login data",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const user = await loginUser(parsed.data);

    return NextResponse.json({
      user,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      return NextResponse.json(
        {
          error: "INVALID_CREDENTIALS",
          message: error.message,
        },
        { status: 401 },
      );
    }

    if (
      error instanceof Error &&
      error.message === "This account is inactive"
    ) {
      return NextResponse.json(
        {
          error: "ACCOUNT_INACTIVE",
          message: error.message,
        },
        { status: 403 },
      );
    }

    console.error("Login error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
};