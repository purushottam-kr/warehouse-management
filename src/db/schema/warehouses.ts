import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const warehouseStatusEnum = pgEnum("warehouse_status", [
  "ACTIVE",
  "INACTIVE",
]);

export const warehouses = pgTable("warehouses", {
  id: uuid("id").defaultRandom().primaryKey(),

  name: text("name").notNull(),

  code: text("code").notNull().unique(),

  address: text("address"),

  status: warehouseStatusEnum("status")
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

  deletedAt: timestamp("deleted_at", {
    withTimezone: true,
  }),
});