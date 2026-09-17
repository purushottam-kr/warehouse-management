import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

import {
  hashPassword,
  verifyPassword,
} from "./password";

import {
  createSession,
  deleteSession,
  getCurrentSession,
} from "./session";

type RegisterUserInput = {
  email: string;
  password: string;
  name?: string;
};

export const registerUser = async (
  input: RegisterUserInput,
) => {
  const email = input.email.trim().toLowerCase();

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (existingUser) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash,
      name: input.name?.trim() || null,
      role: "STAFF",
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    });

  return user;
}

type LoginUserInput = {
  email: string;
  password: string;
};

export const loginUser = async (input: LoginUserInput) => {
  const email = input.email.trim().toLowerCase();

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("This account is inactive");
  }

  const passwordValid = await verifyPassword(
    input.password,
    user.passwordHash,
  );

  if (!passwordValid) {
    throw new Error("Invalid email or password");
  }

  await createSession(user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export const logoutUser = async () => {
  await deleteSession();
};

export const getCurrentUser = async () => {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  return {
    id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
  };
}