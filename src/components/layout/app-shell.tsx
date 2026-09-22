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
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <Sidebar role={user.role} />

      <div className="flex min-w-0 flex-1 flex-col h-screen overflow-hidden">
        <Header
          name={user.name}
          role={user.role}
        />

        <main className="min-w-0 flex-1 flex flex-col overflow-hidden p-6">
          {children}
        </main>
      </div>
    </div>
  );
};