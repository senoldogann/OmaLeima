import type { DashboardShortcut } from "@/features/dashboard/components/dashboard-shortcuts-grid";
import type { DashboardLocale } from "@/features/dashboard/i18n";
import type { DashboardNavItem, DashboardSection } from "@/features/dashboard/types";

export const adminDashboardNavigationItems: DashboardNavItem[] = [
  {
    href: "/admin",
    iconName: "dashboard",
    label: "Dashboard",
  },
  {
    href: "/admin/oversight",
    iconName: "oversight",
    label: "Platform oversight",
  },
  {
    href: "/admin/business-applications",
    iconName: "applications",
    label: "Business applications",
  },
  {
    href: "/admin/users",
    iconName: "settings",
    label: "Users",
  },
  {
    href: "/admin/department-tags",
    iconName: "tags",
    label: "Department tags",
  },
  {
    href: "/admin/announcements",
    iconName: "announcements",
    label: "Announcements",
  },
  {
    href: "/admin/login-slides",
    iconName: "settings",
    label: "Login slides",
  },
  {
    href: "/admin/rewards",
    iconName: "rewards",
    label: "Reward tiers",
  },
  {
    href: "/admin/contact-submissions",
    iconName: "inbox",
    label: "Contact submissions",
  },
  {
    href: "/admin/support-requests",
    iconName: "inbox",
    label: "Mobile support",
  },
];

export const getClubDashboardNavigationItems = (canManageRewards: boolean): DashboardNavItem[] =>
  [
    {
      href: "/club",
      iconName: "dashboard" as const,
      label: "Dashboard",
    },
    {
      href: "/club/events",
      iconName: "events" as const,
      label: "Club events",
    },
    {
      href: "/club/reports",
      iconName: "audit" as const,
      label: "Reports",
    },
    {
      href: "/club/profile",
      iconName: "settings" as const,
      label: "Profile",
    },
    canManageRewards
      ? {
        href: "/club/department-tags",
        iconName: "tags" as const,
        label: "Department tags",
      }
      : null,
    {
      href: "/club/claims",
      iconName: "claims" as const,
      label: "Reward claims",
    },
    {
      href: "/club/fraud",
      iconName: "fraud" as const,
      label: "Fraud review",
    },
    {
      href: "/club/announcements",
      iconName: "announcements" as const,
      label: "Announcements",
    },
    canManageRewards
      ? {
        href: "/club/rewards",
        iconName: "rewards" as const,
        label: "Reward tiers",
      }
      : null,
  ].flatMap((item) => (item === null ? [] : [item]));

export const adminDashboardSections: DashboardSection[] = [
  {
    title: "Operations",
    tone: "accent",
    items: ["Platform oversight", "Business applications", "Fraud signals", "Announcements"],
  },
  {
    title: "Catalog",
    tone: "neutral",
    items: ["Department tags", "Businesses", "Clubs"],
  },
  {
    title: "Events",
    tone: "neutral",
    items: ["Events", "Venues", "Reward claims"],
  },
  {
    title: "System",
    tone: "warning",
    items: ["Settings", "Launch checklist", "Deployment notes"],
  },
];

type AdminDashboardShortcutCounts = {
  activeClubCount: number;
  announcementCount: number;
  openFraudSignalCount: number;
  operationalEventCount: number;
  pendingBusinessApplicationCount: number;
  recentAuditCount: number;
};

const formatBadgeCount = (value: number): string => (value > 99 ? "99+" : String(value));

const formatLocalizedBadge = (
  value: number,
  locale: DashboardLocale,
  englishLabel: string,
  finnishLabel: string
): string => `${formatBadgeCount(value)} ${locale === "fi" ? finnishLabel : englishLabel}`;

export const buildAdminDashboardShortcuts = (counts: AdminDashboardShortcutCounts, locale: DashboardLocale): DashboardShortcut[] => [
  {
    badgeTone: "accent",
    badgeValue: formatLocalizedBadge(counts.operationalEventCount, locale, "live", "käynnissä"),
    description: locale === "fi"
      ? "Aktiiviset klubit, käynnissä olevat tapahtumat, valvontaloki ja väärinkäyttöyhteenveto yhdessä näkymässä."
      : "Active clubs, operational events, audit trail, and fraud snapshot in one surface.",
    href: "/admin/oversight",
    iconName: "oversight",
    title: locale === "fi" ? "Alustan valvonta" : "Platform oversight",
  },
  {
    badgeTone: counts.pendingBusinessApplicationCount > 0 ? "warning" : "neutral",
    badgeValue: formatLocalizedBadge(counts.pendingBusinessApplicationCount, locale, "pending", "odottaa"),
    description: locale === "fi"
      ? "Hyväksy tai hylkää saapuneet yrityshakemukset selkeällä perustelulla."
      : "Approve or reject incoming business applications with a clear operator reason.",
    href: "/admin/business-applications",
    iconName: "applications",
    title: locale === "fi" ? "Yrityshakemukset" : "Business applications",
    urgent: counts.pendingBusinessApplicationCount > 0,
  },
  {
    description: locale === "fi"
      ? "Yhdistä päällekkäiset opiskelualojen tunnisteet tai estä heikkolaatuiset."
      : "Merge duplicate department tags into canonical labels or block low-quality ones.",
    href: "/admin/department-tags",
    iconName: "tags",
    title: locale === "fi" ? "Opiskelualojen tunnisteet" : "Department tags",
  },
  {
    badgeTone: "accent",
    badgeValue: formatLocalizedBadge(counts.announcementCount, locale, "live", "aktiivista"),
    description: locale === "fi"
      ? "Julkaise koko alustan sisäisiä tiedotteita, joihin opiskelijat ja järjestäjät voivat luottaa."
      : "Publish platform-wide in-app messages students and organizers can rely on.",
    href: "/admin/announcements",
    iconName: "announcements",
    title: locale === "fi" ? "Tiedotteet" : "Announcements",
  },
  {
    badgeTone: counts.openFraudSignalCount > 0 ? "warning" : "neutral",
    badgeValue: formatLocalizedBadge(counts.openFraudSignalCount, locale, "open", "avoinna"),
    description: locale === "fi"
      ? "Tarkista viimeisimmät avoimet väärinkäyttösignaalit valvontanäkymästä."
      : "Drill into the latest open fraud signals from the same oversight surface.",
    href: "/admin/oversight",
    iconName: "fraud",
    title: locale === "fi" ? "Väärinkäyttösignaalit" : "Fraud signals",
    urgent: counts.openFraudSignalCount > 0,
  },
  {
    badgeValue: `${formatBadgeCount(counts.recentAuditCount)} 24h`,
    description: locale === "fi"
      ? "Järjestelmän kirjaamat tapahtumat viimeisimmältä toimintajaksolta."
      : "Audit log activity recorded by the backend in the last operational window.",
    href: "/admin/oversight",
    iconName: "audit",
    title: locale === "fi" ? "Valvontaloki" : "Audit trail",
  },
];

type ClubDashboardShortcutCounts = {
  announcementCount: number;
  canManageRewards: boolean;
  claimableCandidateCount: number;
  managedClubCount: number;
  officialDepartmentTagCount: number;
  openFraudSignalCount: number;
  rewardTierCount: number;
  visibleEventCount: number;
};

export const buildClubDashboardShortcuts = (counts: ClubDashboardShortcutCounts, locale: DashboardLocale): DashboardShortcut[] => {
  const shortcuts: DashboardShortcut[] = [
    {
      badgeTone: "accent",
      badgeValue: formatLocalizedBadge(counts.visibleEventCount, locale, "listed", "listattu"),
      description: locale === "fi"
        ? "Luo luonnos, julkaise tai päivitä klubin tapahtumia ja tapahtumapäivän asetuksia."
        : "Draft, publish, or update club-owned events and edit event-day settings.",
      href: "/club/events",
      iconName: "events",
      title: locale === "fi" ? "Tapahtumat" : "Club events",
    },
    {
      badgeTone: counts.claimableCandidateCount > 0 ? "warning" : "neutral",
      badgeValue: formatLocalizedBadge(counts.claimableCandidateCount, locale, "ready", "valmis"),
      description: locale === "fi"
        ? "Vahvista palkinnon luovutus opiskelijoille, joiden leimaraja on täyttynyt."
        : "Confirm physical reward handoff for eligible students without exposing extra data.",
      href: "/club/claims",
      iconName: "claims",
      title: locale === "fi" ? "Palkintoluovutukset" : "Reward claims",
    },
    {
      badgeTone: counts.openFraudSignalCount > 0 ? "warning" : "neutral",
      badgeValue: formatLocalizedBadge(counts.openFraudSignalCount, locale, "open", "avoinna"),
      description: locale === "fi"
        ? "Tarkista tapahtumakohtaiset väärinkäyttöilmoitukset ja merkitse todelliset tai väärät hälytykset."
        : "Review event-scoped fraud warnings, confirm real issues, or dismiss false positives.",
      href: "/club/fraud",
      iconName: "fraud",
      title: locale === "fi" ? "Väärinkäyttötarkistus" : "Fraud review",
    },
    {
      badgeTone: "accent",
      badgeValue: formatLocalizedBadge(counts.announcementCount, locale, "live", "aktiivista"),
      description: locale === "fi"
        ? "Lähetä järjestäjäkohtaisia tiedotteita opiskelijoillesi ennen tapahtumaikkunaa."
        : "Send organizer-scoped announcements to your students before each event window.",
      href: "/club/announcements",
      iconName: "announcements",
      title: locale === "fi" ? "Tiedotteet" : "Announcements",
    },
  ];

  if (counts.canManageRewards) {
    shortcuts.push(
      {
        badgeValue: formatLocalizedBadge(counts.officialDepartmentTagCount, locale, "official", "virallista"),
        description: locale === "fi"
          ? "Julkaise viralliset opiskelualojen tunnisteet, jotka opiskelijat näkevät profiilissaan ensimmäisenä."
          : "Publish canonical study labels students see first when they edit their profile tags.",
        href: "/club/department-tags",
        iconName: "tags",
        title: locale === "fi" ? "Opiskelualojen tunnisteet" : "Department tags",
      },
      {
        badgeValue: formatLocalizedBadge(counts.rewardTierCount, locale, "tiers", "tasoa"),
        description: locale === "fi"
          ? "Hallinnoi tapahtumien palkintorajoja, varastomääriä ja luovutusohjeita."
          : "Manage event reward thresholds, stock visibility, and claim handoff instructions.",
        href: "/club/rewards",
        iconName: "rewards",
        title: locale === "fi" ? "Palkintotasot" : "Reward tiers",
      }
    );
  }

  shortcuts.unshift({
    badgeValue: formatLocalizedBadge(counts.managedClubCount, locale, "clubs", "klubia"),
    description: locale === "fi"
      ? "Tässä järjestäjäistunnossa näkyvät aktiiviset klubit."
      : "Active clubs currently visible in this organizer session.",
    href: "/club/events",
    iconName: "venues",
    title: locale === "fi" ? "Hallinnoidut klubit" : "Managed clubs",
  });

  return shortcuts;
};

export const getClubDashboardSections = (canManageRewards: boolean): DashboardSection[] => [
  {
    title: "Event operations",
    tone: "accent",
    items: canManageRewards
      ? ["Club events", "Department tags", "Reward claims", "Reward tiers", "Announcements"]
      : ["Club events", "Reward claims", "Manage venues", "Announcements"],
  },
  {
    title: "Attendance",
    tone: "neutral",
    items: ["Registrations", "Stamp stats", "Recent claims"],
  },
  {
    title: "Integrity",
    tone: "warning",
    items: ["Fraud review", "Audit review", "Rule checks"],
  },
];
