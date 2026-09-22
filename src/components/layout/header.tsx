"use client";

import { LogOut, UserCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import type { UserRole } from "./navigation";

type HeaderProps = {
  name: string;
  role: UserRole;
};

export const Header = ({ name, role }: HeaderProps) => {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      router.push("/login");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="relative z-20 flex h-16 shrink-0 items-center justify-between border-b border-neutral-200 bg-white/95 backdrop-blur-xs px-6 dark:border-neutral-800 dark:bg-neutral-900/95">
      <div>
        <p className="text-sm font-medium text-neutral-950 dark:text-neutral-100">
          Warehouse Management
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <UserCircle className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />

          <div className="text-right">
            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {name}
            </p>

            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {role}
            </p>
          </div>
        </div>

        <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

        <ThemeToggle />

        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-md p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
};