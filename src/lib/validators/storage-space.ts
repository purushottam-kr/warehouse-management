import { z } from "zod";

import { listQueryBaseSchema } from "@/lib/validators/list-query";

export const storageSpaceStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
]);

export const createStorageSpaceSchema = z.object({
  warehouseId: z.string().uuid(),

  name: z
    .string()
    .trim()
    .min(1, "Storage space name is required.")
    .max(100, "Storage space name must be 100 characters or less."),

  code: z
    .string()
    .trim()
    .min(1, "Storage space code is required.")
    .max(50, "Storage space code must be 50 characters or less."),

  capacity: z
  .string()
  .trim()
  .regex(
    /^\d{1,9}(\.\d{1,3})?$/,
    "Capacity must be a valid decimal with up to 9 integer digits and 3 decimal places.",
  )
  .refine(
    (value) => Number(value) > 0,
    "Capacity must be greater than zero.",
  ),

  storageType: z
    .string()
    .trim()
    .min(1, "Storage type is required.")
    .max(50, "Storage type must be 50 characters or less."),
});

export const updateStorageSpaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Storage space name is required.")
    .max(100, "Storage space name must be 100 characters or less.")
    .optional(),

  code: z
    .string()
    .trim()
    .min(1, "Storage space code is required.")
    .max(50, "Storage space code must be 50 characters or less.")
    .optional(),

  capacity: z
    .string()
    .trim()
    .regex(
      /^\d+(\.\d{1,3})?$/,
      "Capacity must be a positive number with up to 3 decimal places.",
    )
    .refine(
      (value) => Number(value) > 0,
      "Capacity must be greater than zero.",
    )
    .optional(),

  storageType: z
    .string()
    .trim()
    .min(1, "Storage type is required.")
    .max(50, "Storage type must be 50 characters or less.")
    .optional(),

  status: storageSpaceStatusSchema.optional(),
});

export type CreateStorageSpaceSchemaInput = z.infer<
  typeof createStorageSpaceSchema
>;

export type UpdateStorageSpaceSchemaInput = z.infer<
  typeof updateStorageSpaceSchema
>;

export const listStorageSpacesQuerySchema =
  listQueryBaseSchema.extend({
    search: z
      .string()
      .trim()
      .max(
        100,
        "Search must be 100 characters or fewer.",
      )
      .optional(),

    warehouseId: z
      .string()
      .uuid("Invalid warehouse ID.")
      .optional(),

    storageType: z
      .string()
      .trim()
      .max(
        50,
        "Storage type must be 50 characters or fewer.",
      )
      .optional(),

    status: storageSpaceStatusSchema.optional(),
  });

export type ListStorageSpacesQuerySchemaInput = z.infer<
  typeof listStorageSpacesQuerySchema
>;