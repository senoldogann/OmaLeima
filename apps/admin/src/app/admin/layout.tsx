import { redirect } from "next/navigation";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

type AdminLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

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
