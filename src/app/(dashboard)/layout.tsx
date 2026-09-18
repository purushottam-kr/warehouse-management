import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser } from "@/lib/auth/auth";

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = async ({
  children,
}: DashboardLayoutProps) => {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: user.name ?? user.email,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
};

export default DashboardLayout;