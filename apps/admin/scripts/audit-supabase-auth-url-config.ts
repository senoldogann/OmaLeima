import {
  assertGoogleOAuthState,
  assertRequiredRedirectUrls,
  fetchAuthConfig,
  readProjectRef,
  resolveSiteUrlState,
} from "./_shared/supabase-auth-config";

const readNextStep = (siteUrlState: "preview-site-url" | "custom-domain-site-url"): string => {
  if (siteUrlState === "preview-site-url") {
    return "switch-site-url-to-custom-domain-when-dns-is-ready";
  }

  return "rerun-hosted-smoke-on-custom-domain";
};

const run = async (): Promise<void> => {
  const projectRef = readProjectRef("SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF");
  const authConfig = await fetchAuthConfig(projectRef);
  const siteUrlState = resolveSiteUrlState(authConfig.site_url);
  const redirectUrls = assertRequiredRedirectUrls(authConfig);

  assertGoogleOAuthState(authConfig);

  console.log(
    [
      "supabase-auth-url-config:READY",
      `project:${projectRef}`,
      `state:${siteUrlState}`,
      `site-url:${authConfig.site_url}`,
      `redirect-count:${redirectUrls.length}`,
      "google:enabled",
      `next:${readNextStep(siteUrlState)}`,
    ].join("|")
  );
};

void run();
