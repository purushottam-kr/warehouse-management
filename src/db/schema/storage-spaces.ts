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
import { layers } from "./layers";

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

    /*
     * Step 1 (additive only) of the physical-hierarchy
     * expansion: nullable parent pointer for the
     * backfill. warehouse_id stays NOT NULL until
     * Step 3 finalize drops it after backfill verifies
     * zero nulls remain.
     */
    layerId: uuid("layer_id").references(() => layers.id, {
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

    index("storage_spaces_layer_id_idx").on(table.layerId),

    check(
      "storage_spaces_capacity_positive",
      sql`${table.capacity} > 0`,
    ),
  ],
);