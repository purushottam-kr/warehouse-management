import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";

type AuthPageGuardProps = {
  children: React.ReactNode;
};

export const AuthPageGuard = async ({
  children,
}: AuthPageGuardProps) => {
  const user = await getCurrentUser();

  if (user) {
    redirect("/");
  }

  return children;
};