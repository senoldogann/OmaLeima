import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

type AuditEnvironment = Record<string, string>;

const runAuditCommand = (environmentVariables: AuditEnvironment): string => {
  try {
    return execFileSync(
      npmBinary,
      ["--prefix", "apps/admin", "run", "audit:supabase-auth-url-config"],
      {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          ...environmentVariables,
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    ).trim();
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    const stdout = error instanceof Error && "stdout" in error ? String(error.stdout).trim() : "";
    const errorOutput = stderr.length > 0 ? stderr : stdout;

    throw new Error(errorOutput.length > 0 ? errorOutput : "Supabase auth URL config audit failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const createAuditResponse = (siteUrl: string, uriAllowList: string, googleEnabled: boolean, googleClientId: string | null): string =>
  JSON.stringify({
    external_google_client_id: googleClientId,
    external_google_enabled: googleEnabled,
    site_url: siteUrl,
    uri_allow_list: uriAllowList,
  });

const previewAllowList = [
  "http://localhost:3001/auth/callback",
  "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/auth/callback",
  "https://admin.omaleima.fi/auth/callback",
  "omaleima://auth/callback",
  "http://localhost:8081/auth/callback",
  "https://*-senol-dogans-projects.vercel.app/**",
].join(",");

const run = async (): Promise<void> => {
  let missingRedirectError = "";

  try {
    runAuditCommand({
      SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF: "test-project",
      SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuditResponse(
        "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app",
        [
          "http://localhost:3001/auth/callback",
          "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/auth/callback",
          "omaleima://auth/callback",
        ].join(","),
        true,
        "google-client-id"
      ),
    });
  } catch (error) {
    missingRedirectError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(missingRedirectError, "Missing required Supabase auth redirect URLs");
  assertIncludes(missingRedirectError, "https://admin.omaleima.fi/auth/callback");

  let googleDisabledError = "";

  try {
    runAuditCommand({
      SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF: "test-project",
      SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuditResponse(
        "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app",
        previewAllowList,
        false,
        null
      ),
    });
  } catch (error) {
    googleDisabledError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(googleDisabledError, "Google auth must stay enabled");

  const previewReadyOutput = runAuditCommand({
    SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF: "test-project",
    SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuditResponse(
      "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app",
      previewAllowList,
      true,
      "google-client-id"
    ),
  });

  assertIncludes(previewReadyOutput, "supabase-auth-url-config:READY");
  assertIncludes(previewReadyOutput, "state:preview-site-url");
  assertIncludes(previewReadyOutput, "next:switch-site-url-to-custom-domain-when-dns-is-ready");

  const customDomainReadyOutput = runAuditCommand({
    SUPABASE_AUTH_CONFIG_AUDIT_PROJECT_REF: "test-project",
    SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuditResponse(
      "https://admin.omaleima.fi",
      previewAllowList,
      true,
      "google-client-id"
    ),
  });

  assertIncludes(customDomainReadyOutput, "supabase-auth-url-config:READY");
  assertIncludes(customDomainReadyOutput, "state:custom-domain-site-url");
  assertIncludes(customDomainReadyOutput, "next:rerun-hosted-smoke-on-custom-domain");

  console.log(
    "supabase-auth-audit-missing-redirect:SUCCESS|supabase-auth-audit-google-disabled:SUCCESS|supabase-auth-audit-preview-ready:SUCCESS|supabase-auth-audit-custom-domain-ready:SUCCESS"
  );
};

void run();
