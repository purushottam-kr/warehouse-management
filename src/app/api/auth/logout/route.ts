import { NextResponse } from "next/server";

import { logoutUser } from "@/lib/auth/auth";

export const POST = async () => {
  try {
    await logoutUser();

    return NextResponse.json({
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      {
        error: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
};