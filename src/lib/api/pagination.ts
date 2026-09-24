/*
 * Shared pagination resolution for list services.
 *
 * Every paged list in the codebase previously duplicated:
 *
 *   totalPages = Math.max(1, Math.ceil(total / pageSize))
 *   page = Math.min(requestedPage, totalPages)
 *
 * Stale page numbers degrade to the nearest valid page
 * instead of an empty result.
 */

export type ResolvedPagination = {
  page: number;
  totalPages: number;
  offset: number;
};

export const resolvePagination = (
  total: number,
  requestedPage: number,
  pageSize: number,
): ResolvedPagination => {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(
    1,
    Math.ceil(total / safePageSize),
  );
  const page = Math.min(
    Math.max(1, requestedPage),
    totalPages,
  );

  return {
    page,
    totalPages,
    offset: (page - 1) * safePageSize,
  };
};

export const clampPageSize = (
  pageSize: number,
  max: number,
): number => {
  return Math.min(Math.max(1, pageSize), max);
};
