import "server-only";

import {
  and,
  asc,
  eq,
  ne,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import type {
  AdminUser,
  UpdateUserInput,
  UserRole,
} from "@/types/user";

type UserSelection = {
  id: typeof users.id;
  email: typeof users.email;
  name: typeof users.name;
  role: typeof users.role;
  isActive: typeof users.isActive;
  createdAt: typeof users.createdAt;
  updatedAt: typeof users.updatedAt;
};

/*
 * passwordHash is deliberately never selected.
 * User rows are returned straight from this
 * selection to API responses.
 */
const userSelection: UserSelection = {
  id: users.id,
  email: users.email,
  name: users.name,
  role: users.role,
  isActive: users.isActive,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export const createUserRepository = () => {
  const findMany = async (): Promise<
    AdminUser[]
  > => {
    return db
      .select(userSelection)
      .from(users)
      .orderBy(asc(users.createdAt));
  };

  const findById = async (
    id: string,
  ): Promise<AdminUser | null> => {
    const [user] = await db
      .select(userSelection)
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ?? null;
  };

  /*
   * Guards against removing the last active
   * administrator. The candidate user can be
   * excluded so demotions are counted correctly.
   */
  const countActiveAdminsExcluding = async (
    excludeUserId: string,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(users)
      .where(
        and(
          eq(users.role, "ADMIN"),
          eq(users.isActive, true),
          ne(users.id, excludeUserId),
        ),
      );

    return Number(result.total);
  };

  const update = async (
    id: string,
    data: UpdateUserInput,
  ): Promise<AdminUser | null> => {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning(userSelection);

    return user ?? null;
  };

  return {
    findMany,
    findById,
    countActiveAdminsExcluding,
    update,
  };
};

export type { UserRole };
