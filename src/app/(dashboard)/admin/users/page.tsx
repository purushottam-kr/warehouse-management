"use client";

import { ShieldCheck, UsersIcon } from "lucide-react";
import { useEffect, useState } from "react";

type UserRole = "ADMIN" | "STAFF";

type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  data: AdminUser[];
};

type UserResponse = {
  data: AdminUser;
};

type MeResponse = {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: UserRole;
  };
};

type ApiErrorResponse = {
  error?: {
    code?: string;
    message?: string;
  };
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const UsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>(
    [],
  );
  const [currentUserId, setCurrentUserId] =
    useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [permissionDenied, setPermissionDenied] =
    useState(false);

  const [savingUserId, setSavingUserId] =
    useState("");
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setError("");

        const [usersResponse, meResponse] =
          await Promise.all([
            fetch("/api/admin/users", {
              cache: "no-store",
            }),
            fetch("/api/auth/me", {
              cache: "no-store",
            }),
          ]);

        const usersData =
          (await usersResponse.json()) as
            | UsersResponse
            | ApiErrorResponse;

        const meData =
          (await meResponse.json()) as
            | MeResponse
            | ApiErrorResponse;

        if (!meResponse.ok) {
          throw new Error(
            "error" in meData
              ? meData.error?.message ??
                  "Unable to load current user."
              : "Unable to load current user.",
          );
        }

        if ("user" in meData) {
          setCurrentUserId(meData.user.id);
        }

        if (usersResponse.status === 403) {
          setPermissionDenied(true);
          setUsers([]);
          return;
        }

        if (!usersResponse.ok) {
          throw new Error(
            "error" in usersData
              ? usersData.error?.message ??
                  "Unable to load users."
              : "Unable to load users.",
          );
        }

        if (!("data" in usersData)) {
          throw new Error(
            "Invalid users response.",
          );
        }

        setUsers(usersData.data);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load users.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    void loadUsers();
  }, []);

  const patchUser = async (
    userId: string,
    payload: {
      role?: UserRole;
      isActive?: boolean;
    },
  ) => {
    setSavingUserId(userId);
    setActionError("");

    try {
      const response = await fetch(
        `/api/admin/users/${userId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as
        | UserResponse
        | ApiErrorResponse;

      if (!response.ok) {
        throw new Error(
          "error" in data
            ? data.error?.message ??
                "Unable to update user."
            : "Unable to update user.",
        );
      }

      if (!("data" in data)) {
        throw new Error(
          "Invalid user response.",
        );
      }

      const updated = data.data;

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updated.id ? updated : user,
        ),
      );
    } catch (patchError) {
      setActionError(
        patchError instanceof Error
          ? patchError.message
          : "Unable to update user.",
      );
    } finally {
      setSavingUserId("");
    }
  };

  const isSelf = (userId: string) =>
    userId === currentUserId;

  return (
    <div className="flex flex-1 flex-col min-h-0 h-full overflow-hidden space-y-4">
      <div className="shrink-0 space-y-4 pb-1">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-950 dark:text-neutral-100">
            Users
          </h1>

          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 ">
            Manage roles and account access.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
          >
            {error}
          </div>
        ) : null}

        {actionError ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300 "
          >
            {actionError}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
        {isLoading ? (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />

                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                    <div className="h-3 w-48 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>

                  <div className="h-8 w-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />

                  <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-100 dark:bg-neutral-800" />
                </div>
              ),
            )}
          </div>
        ) : error ? null : permissionDenied ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <ShieldCheck className="h-5 w-5 text-neutral-500 dark:text-neutral-400 " />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
              Administrator access required
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400 ">
              You do not have permission to manage
              users. Ask an administrator for access.
            </p>
          </div>
        ) : users.length === 0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
              <UsersIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400 " />
            </div>

            <h2 className="mt-4 text-sm font-semibold text-neutral-950 dark:text-neutral-100">
              No users found
            </h2>

            <p className="mt-1 max-w-sm text-sm text-neutral-500 dark:text-neutral-400 ">
              User accounts appear here once people
              register.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[720px]">
              <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 shadow-2xs border-b border-neutral-200 dark:border-neutral-800">
                <tr className="bg-neutral-50 dark:bg-neutral-950">
                  <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    User
                  </th>

                  <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    Email
                  </th>

                  <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    Role
                  </th>

                  <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    Status
                  </th>

                  <th className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-950 px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 ">
                    Joined
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 ">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="transition hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-neutral-950 dark:text-neutral-100">
                          {user.name || "Unnamed user"}
                        </p>

                        {isSelf(user.id) ? (
                          <span className="inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            You
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {user.email}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {isSelf(user.id) ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400"
                          title="You cannot change your own role"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {user.role}
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(event) =>
                            void patchUser(
                              user.id,
                              {
                                role: event.target
                                  .value as UserRole,
                              },
                            )
                          }
                          disabled={
                            savingUserId ===
                            user.id
                          }
                          aria-label={`Role for ${user.email}`}
                          className="h-9 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2.5 text-sm text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-300 focus:ring-1 focus:ring-neutral-950 dark:focus:ring-neutral-300 disabled:cursor-not-allowed disabled:bg-neutral-50 dark:disabled:bg-neutral-800"
                        >
                          <option value="ADMIN">
                            ADMIN
                          </option>

                          <option value="STAFF">
                            STAFF
                          </option>
                        </select>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={
                            user.isActive
                              ? "inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 "
                              : "inline-flex rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400"
                          }
                        >
                          {user.isActive
                            ? "Active"
                            : "Inactive"}
                        </span>

                        {isSelf(user.id) ? null : (
                          <button
                            type="button"
                            onClick={() =>
                              void patchUser(
                                user.id,
                                {
                                  isActive:
                                    !user.isActive,
                                },
                              )
                            }
                            disabled={
                              savingUserId ===
                              user.id
                            }
                            className="text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingUserId ===
                            user.id
                              ? "Saving..."
                              : user.isActive
                                ? "Deactivate"
                                : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {formatDate(user.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!isLoading && !error && users.length > 0 ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 ">
          Deactivated users cannot sign in and lose
          active sessions immediately. The last
          active administrator cannot be demoted or
          deactivated.
        </p>
      ) : null}
    </div>
  );
};

export default UsersPage;
