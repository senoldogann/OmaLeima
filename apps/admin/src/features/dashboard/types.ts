export type DashboardSection = {
  title: string;
  items: string[];
  tone: "neutral" | "accent" | "warning";
};

export type DashboardNavItem = {
  href: string;
  label: string;
};
