import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { resolvePagination } from "@/lib/api/pagination";
import { requirePermission } from "@/lib/auth/authorization";
import { deleteAllUserSessions } from "@/lib/auth/session";
import { createUserRepository } from "@/repositories/user.repository";
import type {
  AdminUser,
  ListUsersQuery,
  UpdateUserInput,
  UserListPage,
} from "@/types/user";

const userRepository = createUserRepository();

export const listUsers = async (): Promise<
  AdminUser[]
> => {
  await requirePermission("USER_MANAGE");

  return userRepository.findMany();
};

export const getUserById = async (
  id: string,
): Promise<AdminUser> => {
  await requirePermission("USER_MANAGE");

  const user = await userRepository.findById(id);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return user;
};

export const listUsersPage = async (
  query: ListUsersQuery,
): Promise<UserListPage> => {
  await requirePermission("USER_MANAGE");

  const search = query.search?.trim() || undefined;

  const filters = { ...query, search };

  const total = await userRepository.countUsers(filters);

  const { page, totalPages, offset } = resolvePagination(
    total,
    query.page,
    query.pageSize,
  );

  const users = await userRepository.findUsers(
    filters,
    query.pageSize,
    offset,
  );

  return {
    users,
    pagination: {
      page,
      pageSize: query.pageSize,
      total,
      totalPages,
    },
  };
};

export const updateUser = async (
  id: string,
  input: UpdateUserInput,
): Promise<AdminUser> => {
  await requirePermission("USER_MANAGE");

  const user = await userRepository.findById(id);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const updateData: UpdateUserInput = {};

  if (
    input.role !== undefined &&
    input.role !== user.role
  ) {
    updateData.role = input.role;
  }

  if (
    input.isActive !== undefined &&
    input.isActive !== user.isActive
  ) {
    updateData.isActive = input.isActive;
  }

  /*
   * Nothing changed.
   *
   * Returning the existing record keeps PATCH
   * idempotent, matching the other services.
   */
  if (Object.keys(updateData).length === 0) {
    return user;
  }

  /*
   * An administrator losing management access
   * (demotion or deactivation) requires another
   * active administrator to remain.
   */
  const losesAdminAccess =
    (updateData.role === "STAFF" &&
      user.role === "ADMIN") ||
    (updateData.isActive === false &&
      user.role === "ADMIN");

  if (losesAdminAccess) {
    const otherActiveAdmins =
      await userRepository.countActiveAdminsExcluding(
        id,
      );

    if (otherActiveAdmins === 0) {
      throw new ConflictError(
        "LAST_ACTIVE_ADMIN",
        "Cannot remove the last active administrator.",
      );
    }
  }

  const updatedUser =
    await userRepository.update(id, updateData);

  if (!updatedUser) {
    throw new NotFoundError("User not found.");
  }

  /*
   * Deactivated users lose their sessions
   * immediately; sessions already validate isActive
   * on every request, this just cleans up.
   */
  if (updateData.isActive === false) {
    await deleteAllUserSessions(id);
  }

  return updatedUser;
};
