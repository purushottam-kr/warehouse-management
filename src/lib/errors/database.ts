// src/lib/errors/database.ts

export const isPostgresUniqueViolation = (
  error: unknown,
  constraint: string,
): boolean => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error)
  ) {
    return false;
  }

  const dbError = error as {
    code?: string;
    constraint?: string;
  };

  return (
    dbError.code === "23505" &&
    dbError.constraint === constraint
  );
};