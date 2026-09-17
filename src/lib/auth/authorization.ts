import "server-only";

import {
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors/errors";

import { getCurrentUser } from "./auth";

export type Role = "ADMIN" | "STAFF";

export type Permission =
  | "WAREHOUSE_CREATE"
  | "WAREHOUSE_UPDATE"
  | "WAREHOUSE_VIEW"
  | "WAREHOUSE_DELETE"
  | "STORAGE_SPACE_CREATE"
  | "STORAGE_SPACE_UPDATE"
  | "STORAGE_SPACE_VIEW"
  | "STORAGE_SPACE_DELETE"
  | "ITEM_CREATE"
  | "ITEM_UPDATE"
  | "ITEM_VIEW"
  | "ITEM_DELETE"
  | "INVENTORY_ALLOCATE"
  | "INVENTORY_MOVE"
  | "USER_MANAGE";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "WAREHOUSE_CREATE",
    "WAREHOUSE_UPDATE",
    "WAREHOUSE_VIEW",
    "WAREHOUSE_DELETE",

    "STORAGE_SPACE_CREATE",
    "STORAGE_SPACE_UPDATE",
    "STORAGE_SPACE_VIEW",
    "STORAGE_SPACE_DELETE",

    "ITEM_CREATE",
    "ITEM_UPDATE",
    "ITEM_VIEW",
    "ITEM_DELETE",

    "INVENTORY_ALLOCATE",
    "INVENTORY_MOVE",

    "USER_MANAGE",
  ],

  STAFF: [
    "WAREHOUSE_CREATE",
    "WAREHOUSE_UPDATE",
    "WAREHOUSE_VIEW",

    "STORAGE_SPACE_CREATE",
    "STORAGE_SPACE_UPDATE",
    "STORAGE_SPACE_VIEW",

    "ITEM_CREATE",
    "ITEM_UPDATE",
    "ITEM_VIEW",

    "INVENTORY_ALLOCATE",
    "INVENTORY_MOVE",
  ],
};

export const requireAuth = async () => {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  return user;
};

export const requireRole = async (role: Role) => {
  const user = await requireAuth();

  if (user.role !== role) {
    throw new ForbiddenError("Forbidden");
  }

  return user;
};

export const requirePermission = async (
  permission: Permission,
) => {
  const user = await requireAuth();

  const permissions = ROLE_PERMISSIONS[user.role];

  if (!permissions.includes(permission)) {
    throw new ForbiddenError("Forbidden");
  }

  return user;
};