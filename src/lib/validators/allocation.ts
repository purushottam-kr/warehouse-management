import { z } from "zod";

const positiveDecimal = z
  .string()
  .regex(
    /^\d+(\.\d{1,3})?$/,
    "Quantity must be a valid decimal with up to 3 decimal places.",
  )
  .refine(
    (value) => Number(value) > 0,
    "Quantity must be greater than zero.",
  );

export const createAllocationSchema = z.object({
  itemId: z.string().uuid("Invalid item ID."),

  quantity: positiveDecimal,
});