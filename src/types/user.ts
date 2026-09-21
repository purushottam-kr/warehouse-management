export type UserRole = "ADMIN" | "STAFF";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateUserInput = {
  role?: UserRole;
  isActive?: boolean;
};
