import { z } from "zod";

export const bayStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

export const createBaySchema = z.object({
  aisleId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(1, "Bay name is required.")
    .max(100, "Bay name must be 100 characters or less."),

  code: z
    .string()
    .trim()
    .min(1, "Bay code is required.")
    .max(50, "Bay code must be 50 characters or less."),
});

export const updateBaySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Bay name cannot be empty.")
    .max(100, "Bay name must be 100 characters or less.")
    .optional(),

  code: z
    .string()
    .trim()
    .min(1, "Bay code cannot be empty.")
    .max(50, "Bay code must be 50 characters or less.")
    .optional(),

  status: bayStatusSchema.optional(),
});

export type CreateBaySchemaInput = z.infer<
  typeof createBaySchema
>;

export type UpdateBaySchemaInput = z.infer<
  typeof updateBaySchema
>;
