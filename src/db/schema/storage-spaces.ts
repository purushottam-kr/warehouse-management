import { sql } from "drizzle-orm";
import {
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  check,
} from "drizzle-orm/pg-core";

import { warehouses } from "./warehouses";

export const storageSpaceStatusEnum = pgEnum(
  "storage_space_status",
  ["ACTIVE", "INACTIVE"],
);

export const storageSpaces = pgTable(
  "storage_spaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    warehouseId: uuid("warehouse_id")
      .notNull()
      .references(() => warehouses.id, {
        onDelete: "restrict",
      }),

    name: text("name").notNull(),

    code: text("code").notNull(),

    capacity: numeric("capacity", {
      precision: 12,
      scale: 3,
    }).notNull(),

    storageType: text("storage_type").notNull(),

    status: storageSpaceStatusEnum("status")
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
    unique("storage_spaces_warehouse_code_unique").on(
      table.warehouseId,
      table.code,
    ),

    index("storage_spaces_warehouse_id_idx").on(
      table.warehouseId,
    ),

    check(
      "storage_spaces_capacity_positive",
      sql`${table.capacity} > 0`,
    ),
  ],
);