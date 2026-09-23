import { z } from "zod";

export const layerStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

export const createLayerSchema = z.object({
  bayId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(1, "Layer name is required.")
    .max(100, "Layer name must be 100 characters or less."),

  code: z
    .string()
    .trim()
    .min(1, "Layer code is required.")
    .max(50, "Layer code must be 50 characters or less."),
});

export const updateLayerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Layer name cannot be empty.")
    .max(100, "Layer name must be 100 characters or less.")
    .optional(),

  code: z
    .string()
    .trim()
    .min(1, "Layer code cannot be empty.")
    .max(50, "Layer code must be 50 characters or less.")
    .optional(),

  status: layerStatusSchema.optional(),
});

export type CreateLayerSchemaInput = z.infer<
  typeof createLayerSchema
>;

export type UpdateLayerSchemaInput = z.infer<
  typeof updateLayerSchema
>;
