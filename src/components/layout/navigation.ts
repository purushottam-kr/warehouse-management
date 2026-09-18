import {
  ArrowLeftRight,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  Settings,
  Warehouse,
} from "lucide-react";

export type UserRole = "ADMIN" | "STAFF";

type NavigationItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles?: UserRole[];
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigation: NavigationSection[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        label: "Warehouses",
        href: "/warehouses",
        icon: Warehouse,
      },
      {
        label: "Items",
        href: "/items",
        icon: Package,
      },
    ],
  },
  {
    label: "Inventory",
    items: [
      {
        label: "Allocate",
        href: "/allocations",
        icon: ClipboardList,
      },
      {
        label: "Transfer",
        href: "/transfers",
        icon: ArrowLeftRight,
      },
    ],
  },
  {
  label: "Operations",
  items: [
    {
      label: "Storage Spaces",
      href: "/storage-spaces",
      icon: Boxes,
    },
  ],
},
{
  label: "Administration",
  items: [
    {
      label: "Users",
      href: "/admin/users",
      icon: Settings,
      roles: ["ADMIN"],
    },
  ],
},
];