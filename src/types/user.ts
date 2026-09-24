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

export type ListUsersQuery = {
  page: number;
  pageSize: number;
  search?: string;
  role?: UserRole;
  isActive?: boolean;
};

export type UserListPage = {
  users: AdminUser[];
  pagination: import("@/types/pagination").ListPagination;
};
