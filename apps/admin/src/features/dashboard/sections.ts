import type { DashboardSection } from "@/features/dashboard/types";

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
