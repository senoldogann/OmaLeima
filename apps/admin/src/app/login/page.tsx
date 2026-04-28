import { redirect } from "next/navigation";

import { AdminLoginPanel } from "@/features/auth/components/admin-login-panel";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  if (access.homeHref !== "/login") {
    redirect(access.homeHref);
  }

  return (
    <main className="login-page">
      <AdminLoginPanel />
    </main>
  );
}
