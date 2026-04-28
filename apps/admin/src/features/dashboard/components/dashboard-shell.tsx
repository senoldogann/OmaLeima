import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { DashboardNavItem } from "@/features/dashboard/types";

type DashboardShellProps = {
  activeHref: string;
  areaLabel: string;
  children: React.ReactNode;
  navigationItems: DashboardNavItem[];
  roleLabel: string | null;
  subtitle: string;
  title: string;
  userEmail: string | null;
};

export const DashboardShell = ({
  activeHref,
  areaLabel,
  children,
  navigationItems,
  roleLabel,
  subtitle,
  title,
  userEmail,
}: DashboardShellProps) => (
  <div className="shell">
    <aside className="sidebar">
      <div className="stack-md">
        <div className="eyebrow">OmaLeima</div>
        <div className="stack-sm">
          <h1 className="sidebar-title">{areaLabel}</h1>
          <p className="muted-text">{userEmail ?? "Authenticated session"}</p>
          <span className="status-pill">{roleLabel ?? "Unknown role"}</span>
        </div>
      </div>

      <nav className="stack-sm">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            className={`nav-link ${item.href === activeHref ? "nav-link-active" : ""}`}
            href={item.href}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <SignOutButton />
    </aside>

    <main className="content">
      <header className="panel">
        <div className="eyebrow">{areaLabel}</div>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-copy">{subtitle}</p>
      </header>

      {children}
    </main>
  </div>
);
