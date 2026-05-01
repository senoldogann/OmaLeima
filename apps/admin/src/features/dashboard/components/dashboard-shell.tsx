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
      <div className="stack-lg">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            OL
          </span>
          <div>
            <div className="eyebrow">OmaLeima</div>
            <h1 className="sidebar-title">{areaLabel}</h1>
          </div>
        </div>

        <div className="session-strip">
          <span>{roleLabel ?? "Unknown role"}</span>
          <strong>{userEmail ?? "Authenticated session"}</strong>
        </div>
      </div>

      <nav className="stack-sm">
        {navigationItems.map((item) => (
          <Link
            key={item.href}
            className={`nav-link ${item.href === activeHref ? "nav-link-active" : ""}`}
            href={item.href}
          >
            <span className="nav-dot" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>

      <SignOutButton />
    </aside>

    <main className="content">
      <header className="panel hero-banner">
        <div className="hero-banner-content">
          <div className="eyebrow">{areaLabel}</div>
          <h2 className="panel-title">{title}</h2>
          <p className="panel-copy">{subtitle}</p>
        </div>
      </header>

      {children}
    </main>
  </div>
);
