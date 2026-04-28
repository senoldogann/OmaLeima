import { redirect } from "next/navigation";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

type ClubLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ClubLayout({ children }: ClubLayoutProps) {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

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
