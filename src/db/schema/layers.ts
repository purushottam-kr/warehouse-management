import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { bays } from "./bays";

export const layerStatusEnum = pgEnum("layer_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const layers = pgTable(
  "layers",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    bayId: uuid("bay_id")
      .notNull()
      .references(() => bays.id, {
        onDelete: "restrict",
      }),

    name: text("name").notNull(),

    code: text("code").notNull(),

    status: layerStatusEnum("status")
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
    unique("layers_bay_code_unique").on(
      table.bayId,
      table.code,
    ),

    index("layers_bay_id_idx").on(table.bayId),
  ],
);
