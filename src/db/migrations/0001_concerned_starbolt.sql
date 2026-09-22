ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_from_storage_space_id_storage_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_to_storage_space_id_storage_spaces_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_from_storage_space_id_storage_spaces_id_fk" FOREIGN KEY ("from_storage_space_id") REFERENCES "public"."storage_spaces"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_to_storage_space_id_storage_spaces_id_fk" FOREIGN KEY ("to_storage_space_id") REFERENCES "public"."storage_spaces"("id") ON DELETE set null ON UPDATE no action;