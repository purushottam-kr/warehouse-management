import { z } from "zod";

/*
 * Base query schema for paginated list endpoints.
 *
 * Domain list schemas extend this with their own
 * search and filter fields, so page/pageSize parsing
 * stays identical across endpoints.
 */
export const listQueryBaseSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),
});
