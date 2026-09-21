import { z } from "zod";

export const listMovementsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),

  itemId: z
    .string()
    .uuid("Invalid item ID.")
    .optional(),

  type: z
    .enum(["ALLOCATE", "MOVE", "RELEASE"])
    .optional(),

  warehouseId: z
    .string()
    .uuid("Invalid warehouse ID.")
    .optional(),

  search: z
    .string()
    .trim()
    .max(100, "Search must be 100 characters or fewer.")
    .optional(),
});
