import "server-only";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";

const SESSION_COOKIE_NAME = "warehouse_session";

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export const createSession = async (
  userId: string,
): Promise<string> => {
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      expiresAt,
    })
    .returning({
      id: sessions.id,
    });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });

  return session.id;
};

export const getCurrentSession = async () => {
  const cookieStore = await cookies();

  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  const result = await db
    .select({
      sessionId: sessions.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const session = result[0];

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await deleteSession(sessionId);
    return null;
  }

  if (!session.isActive) {
    return null;
  }

  return session;
};

export const deleteSession = async (
  sessionId?: string,
): Promise<void> => {
  const cookieStore = await cookies();

  const id =
    sessionId ??
    cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (id) {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  cookieStore.delete(SESSION_COOKIE_NAME);
};

export const deleteAllUserSessions = async (
  userId: string,
): Promise<void> => {
  await db.delete(sessions).where(eq(sessions.userId, userId));
};