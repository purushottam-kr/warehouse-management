import type { ReactNode } from "react";

import { AuthPageGuard } from "@/components/auth/auth-page-guard";

type AuthLayoutProps = {
  children: ReactNode;
};

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <AuthPageGuard>
      <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-6 py-12">
          {children}
        </div>
      </main>
    </AuthPageGuard>
  );
};

export default AuthLayout;