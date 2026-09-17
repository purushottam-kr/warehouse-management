import { z } from "zod";

const positiveDecimal = z
  .string()
  .regex(
    /^\d{1,9}(\.\d{1,3})?$/,
    "Quantity must be a valid decimal with up to 9 integer digits and 3 decimal places.",
  )
  .refine(
    (value) => Number(value) > 0,
    "Quantity must be greater than zero.",
  );

export const releaseInventorySchema = z.object({
  itemId: z.string().uuid("Invalid item ID."),
  storageSpaceId: z.string().uuid(
    "Invalid storage space ID.",
  ),
  quantity: positiveDecimal,
});