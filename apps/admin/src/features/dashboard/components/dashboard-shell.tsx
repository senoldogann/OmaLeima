import Image from "next/image";
import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { NavIcon } from "@/features/dashboard/components/nav-icon";
import { PageHeader } from "@/features/dashboard/components/page-header";
import {
  getAlternateDashboardLocale,
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
  const alternateLocale = getAlternateDashboardLocale(resolvedLocale);
  const localeSwitchHref = `/api/dashboard-locale?locale=${alternateLocale}&returnTo=${encodeURIComponent(activeHref)}`;
  const translatedNavigationItems = translateDashboardNavigationItems(navigationItems, resolvedLocale);

  return (
    <div className="shell">
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

          <Link className="dashboard-locale-switch" href={localeSwitchHref} hrefLang={alternateLocale}>
            <span>{shellCopy.localeSwitchTitle}</span>
            <strong>{shellCopy.localeSwitchLabel}</strong>
          </Link>
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
