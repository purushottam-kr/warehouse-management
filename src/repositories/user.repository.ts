import "server-only";

import {
  and,
  asc,
  desc,
  eq,
  ilike,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";
import type {
  AdminUser,
  ListUsersQuery,
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

type UserFilters = Pick<
  ListUsersQuery,
  "search" | "role" | "isActive"
>;

const buildUserFilters = (
  filters: UserFilters,
): SQL | undefined => {
  const conditions: SQL[] = [];

  if (filters.search) {
    conditions.push(
      or(
        ilike(users.email, `%${filters.search}%`),
        ilike(users.name, `%${filters.search}%`),
      ) as SQL,
    );
  }

  if (filters.role) {
    conditions.push(eq(users.role, filters.role));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  if (conditions.length === 0) {
    return undefined;
  }

  return and(...conditions);
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

  const countUsers = async (
    filters: UserFilters,
  ): Promise<number> => {
    const [result] = await db
      .select({
        total: sql<string>`count(*)`,
      })
      .from(users)
      .where(buildUserFilters(filters));

    return Number(result.total);
  };

  const findUsers = async (
    filters: UserFilters,
    limit: number,
    offset: number,
  ): Promise<AdminUser[]> => {
    return db
      .select(userSelection)
      .from(users)
      .where(buildUserFilters(filters))
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(limit)
      .offset(offset);
  };

  return {
    findMany,
    findById,
    countActiveAdminsExcluding,
    update,
    countUsers,
    findUsers,
  };
};

export type { UserRole };
