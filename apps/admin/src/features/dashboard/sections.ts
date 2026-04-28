import type { DashboardNavItem, DashboardSection } from "@/features/dashboard/types";

export const adminDashboardNavigationItems: DashboardNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/oversight",
    label: "Platform oversight",
  },
  {
    href: "/admin/business-applications",
    label: "Business applications",
  },
  {
    href: "/admin/department-tags",
    label: "Department tags",
  },
  {
    href: "/forbidden",
    label: "Access policy",
  },
];

export const getClubDashboardNavigationItems = (canManageRewards: boolean): DashboardNavItem[] =>
  [
    {
      href: "/club",
      label: "Dashboard",
    },
    {
      href: "/club/events",
      label: "Club events",
    },
    {
      href: "/club/claims",
      label: "Reward claims",
    },
    canManageRewards
      ? {
          href: "/club/rewards",
          label: "Reward tiers",
        }
      : null,
    {
      href: "/forbidden",
      label: "Access policy",
    },
  ].flatMap((item) => (item === null ? [] : [item]));

export const adminDashboardSections: DashboardSection[] = [
  {
    title: "Operations",
    tone: "accent",
    items: ["Platform oversight", "Business applications", "Fraud signals"],
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

export const getClubDashboardSections = (canManageRewards: boolean): DashboardSection[] => [
  {
    title: "Event operations",
    tone: "accent",
    items: canManageRewards
      ? ["Club events", "Reward claims", "Reward tiers"]
      : ["Club events", "Reward claims", "Manage venues"],
  },
  {
    title: "Attendance",
    tone: "neutral",
    items: ["Registrations", "Stamp stats", "Recent claims"],
  },
  {
    title: "Integrity",
    tone: "warning",
    items: ["Fraud warnings", "Audit review", "Rule checks"],
  },
];
