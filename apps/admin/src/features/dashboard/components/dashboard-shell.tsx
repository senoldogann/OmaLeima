import Image from "next/image";
import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NavIcon } from "@/features/dashboard/components/nav-icon";
import { PageHeader } from "@/features/dashboard/components/page-header";
import type { DashboardNavItem } from "@/features/dashboard/types";

type DashboardShellProps = {
  activeHref: string;
  areaLabel: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
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
  headerActions,
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
            <Image alt="" className="brand-logo" height={44} priority src="/images/omaleima-logo.png" width={44} />
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

      <nav aria-label={`${areaLabel} navigation`} className="stack-sm sidebar-nav">
        {navigationItems.map((item) => {
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`nav-link ${isActive ? "nav-link-active" : ""}`}
              href={item.href}
            >
              <span className="nav-icon" aria-hidden>
                <NavIcon name={item.iconName} />
              </span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <SignOutButton />
    </aside>

    <main className="content">
      <PageHeader actions={headerActions} eyebrow={areaLabel} subtitle={subtitle} title={title} />
      {children}
    </main>
  </div>
);
