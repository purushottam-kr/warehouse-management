import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { Pool } from "pg";
import dotenv from "dotenv";

import {
  cleanup,
  closePool,
  request,
  seedUser,
  trackUser,
} from "./helpers";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adminPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const setUserRole = async (
  userId: string,
  role: "ADMIN" | "STAFF",
): Promise<void> => {
  await adminPool.query(
    "UPDATE users SET role = $1 WHERE id = $2",
    [role, userId],
  );
};

/*
 * seedUser is called staff-first so the session
 * captured by helpers belongs to the ADMIN.
 */
describe("Admin user management (integration)", () => {
  let admin: { id: string; email: string };
  let staff: { id: string; email: string };

  beforeAll(async () => {
    staff = await seedUser("staff");
    admin = await seedUser("admin");

    trackUser(staff.id);
    trackUser(admin.id);

    // Sessions read role live from the users table,
    // so promoting via SQL is enough.
    await setUserRole(admin.id, "ADMIN");
  });

  afterAll(async () => {
    await adminPool.end();

    await cleanup();

    await closePool();
  });

  test("GET /api/admin/users lists users without password hashes", async () => {
    const { status, body } = await request<{
      data: Array<{
        id: string;
        email: string;
        role: string;
        isActive: boolean;
        passwordHash?: string;
      }>;
    }>("GET", "/api/admin/users");

    expect(status).toBe(200);

    expect(Array.isArray(body.data)).toBe(true);

    const emails = body.data.map(
      (user) => user.email,
    );

    expect(emails).toContain(staff.email);
    expect(emails).toContain(admin.email);

    for (const user of body.data) {
      expect(user.passwordHash).toBeUndefined();
    }
  });

  test("GET /api/admin/users is forbidden for STAFF", async () => {
    await setUserRole(admin.id, "STAFF");

    const { status, body } = await request<{
      error: { code: string };
    }>("GET", "/api/admin/users");

    expect(status).toBe(403);

    expect(body.error.code).toBe("FORBIDDEN");

    await setUserRole(admin.id, "ADMIN");
  });

  test("PATCH promotes a user to ADMIN", async () => {
    const { status, body } = await request<{
      data: {
        id: string;
        role: string;
      };
    }>("PATCH", `/api/admin/users/${staff.id}`, {
      role: "ADMIN",
    });

    expect(status).toBe(200);

    expect(body.data.id).toBe(staff.id);

    expect(body.data.role).toBe("ADMIN");

    await setUserRole(staff.id, "STAFF");
  });

  test("enforces the last active administrator guard", async () => {
    /*
     * The guard depends on global DB state: it only
     * triggers when no OTHER active administrator
     * exists. Dev databases may legitimately contain
     * additional admins, so assert the branch that
     * matches the environment and restore state.
     */
    const { rows } = await adminPool.query(
      "SELECT count(*)::int AS total FROM users WHERE role = 'ADMIN' AND is_active = true AND id <> $1",
      [admin.id],
    );

    const otherActiveAdmins = rows[0].total;

    if (otherActiveAdmins === 0) {
      const demote = await request<{
        error: { code: string };
      }>("PATCH", `/api/admin/users/${admin.id}`, {
        role: "STAFF",
      });

      expect(demote.status).toBe(409);

      expect(demote.body.error.code).toBe(
        "LAST_ACTIVE_ADMIN",
      );

      const deactivate = await request<{
        error: { code: string };
      }>("PATCH", `/api/admin/users/${admin.id}`, {
        isActive: false,
      });

      expect(deactivate.status).toBe(409);

      expect(deactivate.body.error.code).toBe(
        "LAST_ACTIVE_ADMIN",
      );
    } else {
      const demote = await request<{
        data: { role: string };
      }>("PATCH", `/api/admin/users/${admin.id}`, {
        role: "STAFF",
      });

      expect(demote.status).toBe(200);

      await setUserRole(admin.id, "ADMIN");
    }
  });

  test("PATCH deactivates a user and blocks their login", async () => {
    const { status, body } = await request<{
      data: {
        id: string;
        isActive: boolean;
      };
    }>("PATCH", `/api/admin/users/${staff.id}`, {
      isActive: false,
    });

    expect(status).toBe(200);

    expect(body.data.isActive).toBe(false);

    const loginResponse = await fetch(
      `${process.env.TEST_BASE_URL ?? "http://localhost:3100"}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: staff.email,
          password: "password123",
        }),
      },
    );

    expect(loginResponse.status).toBe(
      403,
    );

    const loginError =
      (await loginResponse.json()) as {
        error: string;
      };

    expect(loginError.error).toBe(
      "ACCOUNT_INACTIVE",
    );

    const { status: reactivateStatus } =
      await request(
        "PATCH",
        `/api/admin/users/${staff.id}`,
        { isActive: true },
      );

    expect(reactivateStatus).toBe(200);
  });

  test("PATCH returns 404 for an unknown user", async () => {
    const { status, body } = await request<{
      error: { code: string };
    }>(
      "PATCH",
      "/api/admin/users/00000000-0000-0000-0000-000000000000",
      { role: "STAFF" },
    );

    expect(status).toBe(404);

    expect(body.error.code).toBe("NOT_FOUND");
  });

  test("PATCH rejects invalid payloads", async () => {
    const { status } = await request(
      "PATCH",
      `/api/admin/users/${staff.id}`,
      { role: "SUPERADMIN" },
    );

    expect(status).toBe(400);
  });
});
