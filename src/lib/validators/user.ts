import { z } from "zod";

export const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "STAFF"]).optional(),

  isActive: z.boolean().optional(),
});
