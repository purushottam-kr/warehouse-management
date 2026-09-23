import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { aisles } from "./aisles";

export const bayStatusEnum = pgEnum("bay_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const bays = pgTable(
  "bays",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    aisleId: uuid("aisle_id")
      .notNull()
      .references(() => aisles.id, {
        onDelete: "restrict",
      }),

    name: text("name").notNull(),

    code: text("code").notNull(),

    status: bayStatusEnum("status")
      .notNull()
      .default("ACTIVE"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("bays_aisle_code_unique").on(
      table.aisleId,
      table.code,
    ),

    index("bays_aisle_id_idx").on(table.aisleId),
  ],
);
