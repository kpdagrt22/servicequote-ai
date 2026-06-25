"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "M3 12 12 4l9 8M5 10v10h14V10" },
  { href: "/quotes", label: "Quotes", icon: "M7 3h7l5 5v13H7zM14 3v5h5" },
  { href: "/price-book", label: "Price book", icon: "M4 5h16M4 12h16M4 19h10" },
  { href: "/customers", label: "Customers", icon: "M16 11a4 4 0 1 0-8 0M3 21a7 7 0 0 1 14 0" },
  { href: "/settings", label: "Settings", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" },
];

export function AppSidebar({ showAdmin }: { showAdmin?: boolean }) {
  const pathname = usePathname();
  const items = showAdmin
    ? [...NAV, { href: "/admin", label: "Admin", icon: "M12 3l8 4v6c0 5-3.5 7-8 8-4.5-1-8-3-8-8V7z" }]
    : NAV;

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
              <path d={item.icon} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
