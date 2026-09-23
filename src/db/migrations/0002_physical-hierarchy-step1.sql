CREATE TYPE "public"."aisle_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."bay_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."layer_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "aisles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "aisle_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aisles_warehouse_code_unique" UNIQUE("warehouse_id","code")
);
--> statement-breakpoint
CREATE TABLE "bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aisle_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "bay_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bays_aisle_code_unique" UNIQUE("aisle_id","code")
);
--> statement-breakpoint
CREATE TABLE "layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bay_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "layer_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "layers_bay_code_unique" UNIQUE("bay_id","code")
);
--> statement-breakpoint
ALTER TABLE "storage_spaces" ADD COLUMN "layer_id" uuid;--> statement-breakpoint
ALTER TABLE "aisles" ADD CONSTRAINT "aisles_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bays" ADD CONSTRAINT "bays_aisle_id_aisles_id_fk" FOREIGN KEY ("aisle_id") REFERENCES "public"."aisles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "layers" ADD CONSTRAINT "layers_bay_id_bays_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."bays"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aisles_warehouse_id_idx" ON "aisles" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "bays_aisle_id_idx" ON "bays" USING btree ("aisle_id");--> statement-breakpoint
CREATE INDEX "layers_bay_id_idx" ON "layers" USING btree ("bay_id");--> statement-breakpoint
ALTER TABLE "storage_spaces" ADD CONSTRAINT "storage_spaces_layer_id_layers_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."layers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "storage_spaces_layer_id_idx" ON "storage_spaces" USING btree ("layer_id");