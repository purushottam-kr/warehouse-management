import { z } from "zod";

export const createItemSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(50, "SKU must be 50 characters or fewer."),

  name: z
    .string()
    .trim()
    .min(1, "Item name is required.")
    .max(100, "Item name must be 100 characters or fewer."),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer.")
    .optional(),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(30, "Unit must be 30 characters or fewer."),

  requiredStorageType: z
    .string()
    .trim()
    .min(1, "Storage type cannot be empty.")
    .max(50, "Storage type must be 50 characters or fewer.")
    .optional(),
});

export const updateItemSchema = z.object({
  sku: z
    .string()
    .trim()
    .min(1, "SKU is required.")
    .max(50, "SKU must be 50 characters or fewer.")
    .optional(),

  name: z
    .string()
    .trim()
    .min(1, "Item name is required.")
    .max(100, "Item name must be 100 characters or fewer.")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or fewer.")
    .nullable()
    .optional(),

  unit: z
    .string()
    .trim()
    .min(1, "Unit is required.")
    .max(30, "Unit must be 30 characters or fewer.")
    .optional(),

  requiredStorageType: z
    .string()
    .trim()
    .min(1, "Storage type cannot be empty.")
    .max(50, "Storage type must be 50 characters or fewer.")
    .nullable()
    .optional(),
});