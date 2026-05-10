import Image from "next/image";
import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { DashboardLocaleSwitch } from "@/features/dashboard/components/dashboard-locale-switch";
import { DashboardProfileStatusWatcher } from "@/features/dashboard/components/dashboard-profile-status-watcher";
import { NavIcon } from "@/features/dashboard/components/nav-icon";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  getDashboardLocaleAsync,
  getDashboardShellCopy,
  translateDashboardNavigationItems,
} from "@/features/dashboard/i18n";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import type { DashboardNavItem } from "@/features/dashboard/types";

type DashboardShellProps = {
  activeHref: string;
  areaLabel: string;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  locale?: DashboardLocale;
  navigationItems: DashboardNavItem[];
  roleLabel: string | null;
  subtitle: string;
  title: string;
  userEmail: string | null;
};

export const DashboardShell = async ({
  activeHref,
  areaLabel,
  children,
  headerActions,
  locale,
  navigationItems,
  roleLabel,
  subtitle,
  title,
  userEmail,
}: DashboardShellProps) => {
  const resolvedLocale = locale ?? (await getDashboardLocaleAsync());
  const shellCopy = getDashboardShellCopy({
    activeHref,
    areaLabel,
    locale: resolvedLocale,
    subtitle,
    title,
  });
  const translatedNavigationItems = translateDashboardNavigationItems(navigationItems, resolvedLocale);

  return (
    <div className="shell">
      <DashboardProfileStatusWatcher />
      <aside className="sidebar">
        <div className="stack-lg">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <Image alt="" className="brand-logo" height={44} priority src="/images/omaleima-logo.png" width={44} />
            </span>
            <div>
              <div className="eyebrow">OmaLeima</div>
              <h1 className="sidebar-title">{shellCopy.areaLabel}</h1>
            </div>
          </div>

          <div className="session-strip">
            <span>{roleLabel ?? shellCopy.roleFallback}</span>
            <strong>{userEmail ?? shellCopy.sessionFallback}</strong>
          </div>

          <DashboardLocaleSwitch
            currentLocale={resolvedLocale}
            title={shellCopy.localeSwitchTitle}
          />
        </div>

        <nav aria-label={`${shellCopy.areaLabel} navigation`} className="stack-sm sidebar-nav">
          {translatedNavigationItems.map((item) => {
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
        <PageHeader actions={headerActions} eyebrow={shellCopy.areaLabel} subtitle={shellCopy.subtitle} title={shellCopy.title} />
        {children}
      </main>
    </div>
  );
};
