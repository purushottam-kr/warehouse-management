import { AppError } from "@/lib/errors/errors";

export const errorResponse = (error: unknown) => {
  if (error instanceof AppError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      {
        status: error.statusCode,
      },
    );
  }

  console.error("Unhandled API error:", error);

  return Response.json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
      },
    },
    {
      status: 500,
    },
  );
};