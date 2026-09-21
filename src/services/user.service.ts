import "server-only";

import {
  ConflictError,
  NotFoundError,
} from "@/lib/errors/errors";
import { deleteAllUserSessions } from "@/lib/auth/session";
import { createUserRepository } from "@/repositories/user.repository";
import type {
  AdminUser,
  UpdateUserInput,
} from "@/types/user";

const userRepository = createUserRepository();

export const listUsers = async (): Promise<
  AdminUser[]
> => {
  return userRepository.findMany();
};

export const updateUser = async (
  id: string,
  input: UpdateUserInput,
): Promise<AdminUser> => {
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
