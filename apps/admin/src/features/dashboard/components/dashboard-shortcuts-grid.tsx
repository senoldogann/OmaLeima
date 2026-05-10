import Link from "next/link";

import { NavIcon, type NavIconName } from "@/features/dashboard/components/nav-icon";

// Dashboard home sayfalarindaki tiklanabilir shortcut karti modeli.
// Eski statik bullet listesi yerine her item bir Link kart olur; opsiyonel count badge tonlu gosterilir.

export type DashboardShortcut = {
    badgeTone?: "neutral" | "accent" | "warning";
    badgeValue?: string;
    description: string;
    href: string;
    iconName: NavIconName;
    title: string;
    urgent?: boolean;
};

type DashboardShortcutsGridProps = {
    shortcuts: DashboardShortcut[];
};

const resolveBadgeClassName = (tone: DashboardShortcut["badgeTone"]): string => {
    switch (tone) {
        case "warning":
            return "shortcut-badge shortcut-badge-warning";
        case "accent":
            return "shortcut-badge shortcut-badge-accent";
        case "neutral":
            return "shortcut-badge";
        case undefined:
            return "shortcut-badge";
    }
};

export const DashboardShortcutsGrid = ({ shortcuts }: DashboardShortcutsGridProps) => (
    <section className="shortcut-grid">
        {shortcuts.map((shortcut) => (
            <Link
                key={`${shortcut.href}-${shortcut.title}`}
                className={shortcut.urgent === true ? "shortcut-card shortcut-card-urgent" : "shortcut-card"}
                href={shortcut.href}
            >
                <span className="shortcut-icon" aria-hidden>
                    <NavIcon name={shortcut.iconName} />
                </span>
                <div className="shortcut-body">
                    <div className="shortcut-heading-row">
                        <h3 className="shortcut-title">{shortcut.title}</h3>
                        {shortcut.badgeValue === undefined ? (
                            <span className="shortcut-arrow" aria-hidden>
                                →
                            </span>
                        ) : (
                            <span className={resolveBadgeClassName(shortcut.badgeTone)}>{shortcut.badgeValue}</span>
                        )}
                    </div>
                    <p className="shortcut-description">{shortcut.description}</p>
                </div>
            </Link>
        ))}
    </section>
);
