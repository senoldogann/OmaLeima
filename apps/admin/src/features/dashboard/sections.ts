import type { DashboardShortcut } from "@/features/dashboard/components/dashboard-shortcuts-grid";
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
    href: "/admin/contact-submissions",
    iconName: "inbox",
    label: "Contact submissions",
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

export const buildAdminDashboardShortcuts = (counts: AdminDashboardShortcutCounts): DashboardShortcut[] => [
  {
    badgeTone: "accent",
    badgeValue: `${formatBadgeCount(counts.operationalEventCount)} live`,
    description: "Active clubs, operational events, audit trail, and fraud snapshot in one surface.",
    href: "/admin/oversight",
    iconName: "oversight",
    title: "Platform oversight",
  },
  {
    badgeTone: counts.pendingBusinessApplicationCount > 0 ? "warning" : "neutral",
    badgeValue: `${formatBadgeCount(counts.pendingBusinessApplicationCount)} pending`,
    description: "Approve or reject incoming business applications with a clear operator reason.",
    href: "/admin/business-applications",
    iconName: "applications",
    title: "Business applications",
  },
  {
    description: "Merge duplicate department tags into canonical labels or block low-quality ones.",
    href: "/admin/department-tags",
    iconName: "tags",
    title: "Department tags",
  },
  {
    badgeTone: "accent",
    badgeValue: `${formatBadgeCount(counts.announcementCount)} live`,
    description: "Publish platform-wide in-app messages students and organizers can rely on.",
    href: "/admin/announcements",
    iconName: "announcements",
    title: "Announcements",
  },
  {
    badgeTone: counts.openFraudSignalCount > 0 ? "warning" : "neutral",
    badgeValue: `${formatBadgeCount(counts.openFraudSignalCount)} open`,
    description: "Drill into the latest open fraud signals from the same oversight surface.",
    href: "/admin/oversight",
    iconName: "fraud",
    title: "Fraud signals",
  },
  {
    badgeValue: `${formatBadgeCount(counts.recentAuditCount)} 24h`,
    description: "Audit log activity recorded by the backend in the last operational window.",
    href: "/admin/oversight",
    iconName: "audit",
    title: "Audit trail",
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

export const buildClubDashboardShortcuts = (counts: ClubDashboardShortcutCounts): DashboardShortcut[] => {
  const shortcuts: DashboardShortcut[] = [
    {
      badgeTone: "accent",
      badgeValue: `${formatBadgeCount(counts.visibleEventCount)} listed`,
      description: "Draft, publish, or update club-owned events and edit event-day settings.",
      href: "/club/events",
      iconName: "events",
      title: "Club events",
    },
    {
      badgeTone: counts.claimableCandidateCount > 0 ? "warning" : "neutral",
      badgeValue: `${formatBadgeCount(counts.claimableCandidateCount)} ready`,
      description: "Confirm physical reward handoff for eligible students without exposing extra data.",
      href: "/club/claims",
      iconName: "claims",
      title: "Reward claims",
    },
    {
      badgeTone: counts.openFraudSignalCount > 0 ? "warning" : "neutral",
      badgeValue: `${formatBadgeCount(counts.openFraudSignalCount)} open`,
      description: "Review event-scoped fraud warnings, confirm real issues, or dismiss false positives.",
      href: "/club/fraud",
      iconName: "fraud",
      title: "Fraud review",
    },
    {
      badgeTone: "accent",
      badgeValue: `${formatBadgeCount(counts.announcementCount)} live`,
      description: "Send organizer-scoped announcements to your students before each event window.",
      href: "/club/announcements",
      iconName: "announcements",
      title: "Announcements",
    },
  ];

  if (counts.canManageRewards) {
    shortcuts.push(
      {
        badgeValue: `${formatBadgeCount(counts.officialDepartmentTagCount)} official`,
        description: "Publish canonical study labels students see first when they edit their profile tags.",
        href: "/club/department-tags",
        iconName: "tags",
        title: "Department tags",
      },
      {
        badgeValue: `${formatBadgeCount(counts.rewardTierCount)} tiers`,
        description: "Manage event reward thresholds, stock visibility, and claim handoff instructions.",
        href: "/club/rewards",
        iconName: "rewards",
        title: "Reward tiers",
      }
    );
  }

  shortcuts.unshift({
    badgeValue: `${formatBadgeCount(counts.managedClubCount)} clubs`,
    description: "Active clubs currently visible in this organizer session.",
    href: "/club/events",
    iconName: "venues",
    title: "Managed clubs",
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
