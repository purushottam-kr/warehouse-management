import { z } from "zod";

export const aisleStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

export const createAisleSchema = z.object({
  warehouseId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(1, "Aisle name is required.")
    .max(100, "Aisle name must be 100 characters or less."),

  code: z
    .string()
    .trim()
    .min(1, "Aisle code is required.")
    .max(50, "Aisle code must be 50 characters or less."),
});

export const updateAisleSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Aisle name cannot be empty.")
    .max(100, "Aisle name must be 100 characters or less.")
    .optional(),

  code: z
    .string()
    .trim()
    .min(1, "Aisle code cannot be empty.")
    .max(50, "Aisle code must be 50 characters or less.")
    .optional(),

  status: aisleStatusSchema.optional(),
});

export type CreateAisleSchemaInput = z.infer<
  typeof createAisleSchema
>;

export type UpdateAisleSchemaInput = z.infer<
  typeof updateAisleSchema
>;
