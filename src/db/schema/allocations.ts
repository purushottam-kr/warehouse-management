import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { items } from "./items";
import { storageSpaces } from "./storage-spaces";

export const allocations = pgTable(
  "allocations",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, {
        onDelete: "restrict",
      }),

    storageSpaceId: uuid("storage_space_id")
      .notNull()
      .references(() => storageSpaces.id, {
        onDelete: "restrict",
      }),

    quantity: numeric("quantity", {
      precision: 12,
      scale: 3,
    }).notNull(),

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
    unique("allocations_item_space_unique").on(
      table.itemId,
      table.storageSpaceId,
    ),

    index("allocations_item_id_idx").on(table.itemId),

    index("allocations_storage_space_id_idx").on(
      table.storageSpaceId,
    ),

    check(
      "allocations_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
  ],
);