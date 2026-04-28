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

export const clubDashboardNavigationItems: DashboardNavItem[] = [
  {
    href: "/club",
    label: "Dashboard",
  },
  {
    href: "/forbidden",
    label: "Access policy",
  },
];

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

export const clubDashboardSections: DashboardSection[] = [
  {
    title: "Event operations",
    tone: "accent",
    items: ["Create event", "Manage venues", "Reward tiers"],
  },
  {
    title: "Attendance",
    tone: "neutral",
    items: ["Registrations", "Stamp stats", "Reward claims"],
  },
  {
    title: "Integrity",
    tone: "warning",
    items: ["Fraud warnings", "Audit review", "Rule checks"],
  },
];
