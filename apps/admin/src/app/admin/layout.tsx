import { redirect } from "next/navigation";

import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const access = await resolveCurrentAdminAccessAsync();

  if (access.area === "anonymous") {
    redirect("/login");
  }

  if (access.area === "club") {
    redirect("/club");
  }

  if (access.area !== "admin") {
    redirect("/forbidden");
  }

  return children;
}
