import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { DashboardSection } from "@/features/dashboard/types";

type DashboardShellProps = {
  areaLabel: string;
  title: string;
  subtitle: string;
  userEmail: string | null;
  roleLabel: string | null;
  sections: DashboardSection[];
};

export const DashboardShell = ({
  areaLabel,
  title,
  subtitle,
  userEmail,
  roleLabel,
  sections,
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
        <Link className="nav-link nav-link-active" href={areaLabel === "Platform admin" ? "/admin" : "/club"}>
          Dashboard
        </Link>
        <Link className="nav-link" href="/forbidden">
          Access policy
        </Link>
      </nav>

      <SignOutButton />
    </aside>

    <main className="content">
      <header className="panel">
        <div className="eyebrow">{areaLabel}</div>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-copy">{subtitle}</p>
      </header>

      <section className="content-grid">
        {sections.map((section) => (
          <article
            key={section.title}
            className={`panel ${section.tone === "accent" ? "panel-accent" : section.tone === "warning" ? "panel-warning" : ""}`}
          >
            <div className="stack-sm">
              <h3 className="section-title">{section.title}</h3>
              <ul className="list">
                {section.items.map((item) => (
                  <li key={item} className="list-item">
                    <span>{item}</span>
                    <span className="list-badge">Ready next</span>
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>
    </main>
  </div>
);
