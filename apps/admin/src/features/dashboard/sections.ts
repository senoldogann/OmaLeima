import type { DashboardNavItem, DashboardSection } from "@/features/dashboard/types";

export const adminDashboardNavigationItems: DashboardNavItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
  },
  {
    href: "/admin/business-applications",
    label: "Business applications",
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
    items: ["Business applications", "Fraud signals", "Audit logs"],
  },
  {
    title: "Catalog",
    tone: "neutral",
    items: ["Businesses", "Clubs", "Department tags"],
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
