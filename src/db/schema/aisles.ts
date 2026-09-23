import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { warehouses } from "./warehouses";

export const aisleStatusEnum = pgEnum("aisle_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const aisles = pgTable(
  "aisles",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, {
        onDelete: "restrict",
      }),

    name: text("name").notNull(),

    code: text("code").notNull(),

    status: aisleStatusEnum("status")
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
    unique("aisles_warehouse_code_unique").on(
      table.warehouseId,
      table.code,
    ),

    index("aisles_warehouse_id_idx").on(
      table.warehouseId,
    ),
  ],
);
