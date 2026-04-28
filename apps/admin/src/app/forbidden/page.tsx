import Link from "next/link";

import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { resolveAdminAccessAsync } from "@/features/auth/access";
import { createServerComponentClient } from "@/lib/supabase/server";

export default async function ForbiddenPage() {
  const supabase = await createServerComponentClient();
  const access = await resolveAdminAccessAsync(supabase);

  return (
    <main className="forbidden-page">
      <section className="panel forbidden-panel">
        <div className="eyebrow">Access</div>
        <h1 className="panel-title">This session cannot open the admin panel</h1>
        <p className="panel-copy">
          The authenticated profile does not currently map to a platform admin or club dashboard surface.
        </p>
        <div className="stack-sm">
          <span className="status-pill">Role: {access.primaryRole ?? "Unknown"}</span>
          <span className="status-pill">Status: {access.profileStatus ?? "Missing profile"}</span>
        </div>
        <div className="action-row">
          {access.area === "anonymous" ? (
            <Link className="button button-secondary" href="/login">
              Back to login
            </Link>
          ) : null}
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
