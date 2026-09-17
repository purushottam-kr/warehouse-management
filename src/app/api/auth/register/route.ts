import { NextResponse } from "next/server";

import { registerUser } from "@/lib/auth/auth";
import { registerSchema } from "@/lib/validators/auth";

export const POST = async (request: Request) => {
  try {
    const body: unknown = await request.json();

    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION_ERROR",
          message: "Invalid registration data",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const user = await registerUser(parsed.data);

    return NextResponse.json(
      {
        user,
      },
    {
      status: 201,
    },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "An account with this email already exists"
    ) {
      return NextResponse.json(
        {
          error: "EMAIL_ALREADY_EXISTS",
          message: error.message,
        },
        { status: 409 },
      );
    }

    console.error("Registration error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
};