import { redirect } from "next/navigation";

import { resolveCurrentAdminAccessAsync } from "@/features/auth/access";

type ClubLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ClubLayout({ children }: ClubLayoutProps) {
  const access = await resolveCurrentAdminAccessAsync();

  if (access.area === "anonymous") {
    redirect("/login");
  }

  if (access.area === "admin") {
    redirect("/admin");
  }

  if (access.area !== "club") {
    redirect("/forbidden");
  }

  return children;
}
