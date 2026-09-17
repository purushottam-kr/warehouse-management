import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";

export const GET = async () => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          error: "UNAUTHENTICATED",
          message: "Authentication required",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
};
