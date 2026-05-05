import type { NavIconName } from "@/features/dashboard/components/nav-icon";

export type DashboardSection = {
  title: string;
  items: string[];
  tone: "neutral" | "accent" | "warning";
};

export type DashboardNavItem = {
  href: string;
  iconName: NavIconName;
  label: string;
};

export type DashboardOverviewMetric = {
  description: string;
  label: string;
  tone: "neutral" | "accent" | "warning";
  value: string;
};
