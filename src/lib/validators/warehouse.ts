import { z } from "zod";

export const warehouseStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

export const createWarehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name is required")
    .max(100, "Warehouse name must be 100 characters or less"),

  code: z
    .string()
    .trim()
    .min(1, "Warehouse code is required")
    .max(50, "Warehouse code must be 50 characters or less"),

  address: z
    .string()
    .trim()
    .max(255, "Address must be 255 characters or less")
    .optional(),
});

export const updateWarehouseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Warehouse name cannot be empty")
    .max(100, "Warehouse name must be 100 characters or less")
    .optional(),

  code: z
    .string()
    .trim()
    .min(1, "Warehouse code cannot be empty")
    .max(50, "Warehouse code must be 50 characters or less")
    .optional(),

  address: z
    .string()
    .trim()
    .max(255, "Address must be 255 characters or less")
    .nullable()
    .optional(),

  status: warehouseStatusSchema.optional(),
});

export type CreateWarehouseInput = z.infer<
  typeof createWarehouseSchema
>;

export type UpdateWarehouseInput = z.infer<
  typeof updateWarehouseSchema
>;