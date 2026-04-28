import { redirect } from "next/navigation";

import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  redirect(access.homeHref);
}
