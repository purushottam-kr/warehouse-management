import type { NextRequest } from "next/server";
import type { z } from "zod";

/*
 * Shared parsing convention for list endpoints.
 *
 * Empty query-string values are dropped so optional
 * filters stay absent instead of failing uuid/enum
 * validation.
 *
 * A request without any query parameters is reported
 * as `empty: true`. Callers treat that as "return the
 * full unpaged list" — option dropdowns load complete
 * lists this way, while list pages always send
 * page/pageSize and receive the paginated response
 * shape `{ data, pagination }`.
 */
export type ParsedListQuery<T> =
  | { ok: true; empty: true }
  | { ok: true; empty: false; query: T }
  | { ok: false; response: Response };

export const parseListQuery = <S extends z.ZodType>(
  request: NextRequest,
  schema: S,
): ParsedListQuery<z.infer<S>> => {
  const rawQuery = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  );

  const cleanedQuery = Object.fromEntries(
    Object.entries(rawQuery).filter(
      ([, value]) => value !== "",
    ),
  );

  if (Object.keys(cleanedQuery).length === 0) {
    return { ok: true, empty: true };
  }

  const result = schema.safeParse(cleanedQuery);

  if (!result.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters.",
            details: result.error.flatten(),
          },
        },
        {
          status: 400,
        },
      ),
    };
  }

  return { ok: true, empty: false, query: result.data };
};
