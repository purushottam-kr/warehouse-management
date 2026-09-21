"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { navigation, type UserRole } from "./navigation";

type SidebarProps = {
  role: UserRole;
};

export const Sidebar = ({ role }: SidebarProps) => {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="flex h-16 items-center gap-3 border-b border-neutral-200 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white">
          <Package className="h-4 w-4" />
        </div>

        <div>
          <p className="text-sm font-semibold tracking-tight text-neutral-950">
            Warehouse
          </p>
          <p className="text-[11px] text-neutral-500">
            Management
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <div className="space-y-6">
          {navigation.map((section) => {
            const visibleItems = section.items.filter(
              (item) =>
                !item.roles || item.roles.includes(role),
            );

            if (visibleItems.length === 0) {
              return null;
            }

            return (
              <div key={section.label}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  {section.label}
                </p>

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;

                    const isActive =
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                          isActive
                            ? "bg-neutral-100 font-medium text-neutral-950"
                            : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-neutral-200 p-4">
        <p className="text-xs text-neutral-400">
          Warehouse Management
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Inventory operations
        </p>
      </div>
    </aside>
  );
};