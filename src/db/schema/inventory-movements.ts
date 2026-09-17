import {
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { items } from "./items";
import { storageSpaces } from "./storage-spaces";
import { users } from "./users";

export const inventoryMovementTypeEnum = pgEnum(
  "inventory_movement_type",
  ["ALLOCATE", "MOVE", "RELEASE"],
);

export const inventoryMovements = pgTable(
  "inventory_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, {
        onDelete: "restrict",
      }),

    type: inventoryMovementTypeEnum("type").notNull(),

    quantity: numeric("quantity", {
      precision: 12,
      scale: 3,
    }).notNull(),

    fromStorageSpaceId: uuid("from_storage_space_id").references(
      () => storageSpaces.id,
      {
        onDelete: "restrict",
      },
    ),

    toStorageSpaceId: uuid("to_storage_space_id").references(
      () => storageSpaces.id,
      {
        onDelete: "restrict",
      },
    ),

    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, {
        onDelete: "restrict",
      }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("inventory_movements_item_id_idx").on(
      table.itemId,
    ),

    index("inventory_movements_created_at_idx").on(
      table.createdAt,
    ),
  ],
);