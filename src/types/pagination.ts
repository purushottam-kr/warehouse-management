/*
 * Pagination metadata shared by paginated list
 * endpoints.
 *
 * Every paginated list responds as:
 *
 *   { data: [...], pagination: ListPagination }
 */
export type ListPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
