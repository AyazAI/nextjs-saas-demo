"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/app", "Overview"],
  ["/app/tasks", "Tasks"],
  ["/app/clients", "Clients"],
  ["/app/invoices", "Invoices"],
  ["/app/settings", "Members"],
  ["/app/billing", "Billing"],
] as const;

export function SideNav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Workspace">
      {LINKS.map(([href, label]) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={active ? "nav-link active" : "nav-link"}
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
