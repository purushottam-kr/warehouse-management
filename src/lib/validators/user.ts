import { z } from "zod";

export const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),

  isActive: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25),

  search: z
    .string()
    .trim()
    .max(100, "Search must be 100 characters or fewer.")
    .optional(),

  role: z.enum(["ADMIN", "STAFF"]).optional(),

  isActive: z.coerce.boolean().optional(),
});
