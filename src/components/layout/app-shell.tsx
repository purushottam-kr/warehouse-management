import type { ReactNode } from "react";

import { Header } from "./header";
import { Sidebar } from "./sidebar";
import type { UserRole } from "./navigation";

type AppShellProps = {
  children: ReactNode;
  user: {
    name: string;
    role: UserRole;
  };
};

export const AppShell = ({ children, user }: AppShellProps) => {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <Sidebar role={user.role} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          name={user.name}
          role={user.role}
        />

        <main className="min-w-0 flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};