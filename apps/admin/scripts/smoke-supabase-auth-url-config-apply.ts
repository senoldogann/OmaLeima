import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

type ApplyEnvironment = Record<string, string>;

const runApplyCommand = (environmentVariables: ApplyEnvironment): string => {
  try {
    return execFileSync(
      npmBinary,
      ["--prefix", "apps/admin", "run", "apply:supabase-auth-url-config"],
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

    throw new Error(errorOutput.length > 0 ? errorOutput : "Supabase auth apply command failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const createAuthConfig = (siteUrl: string): string =>
  JSON.stringify({
    external_google_client_id: "google-client-id",
    external_google_enabled: true,
    site_url: siteUrl,
    uri_allow_list: [
      "http://localhost:3001/auth/callback",
      "https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app/auth/callback",
      "https://admin.omaleima.fi/auth/callback",
      "omaleima://auth/callback",
      "http://localhost:8081/auth/callback",
      "https://*-senol-dogans-projects.vercel.app/**",
    ].join(","),
  });

const run = async (): Promise<void> => {
  let sameStateError = "";

  try {
    runApplyCommand({
      SUPABASE_AUTH_CONFIG_APPLY_MODE: "dry-run",
      SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF: "test-project",
      SUPABASE_AUTH_CONFIG_APPLY_TARGET: "preview",
      SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuthConfig("https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app"),
    });
  } catch (error) {
    sameStateError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(sameStateError, "already in preview-site-url");

  let gateFailureError = "";

  try {
    runApplyCommand({
      SUPABASE_AUTH_CONFIG_APPLY_MODE: "dry-run",
      SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF: "test-project",
      SUPABASE_AUTH_CONFIG_APPLY_TARGET: "custom-domain",
      SUPABASE_AUTH_CONFIG_APPLY_DOMAIN_GATE_RESULT: "fail",
      SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuthConfig("https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app"),
    });
  } catch (error) {
    gateFailureError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(gateFailureError, "Custom domain readiness gate is not green yet");

  const previewToCustomDryRunOutput = runApplyCommand({
    SUPABASE_AUTH_CONFIG_APPLY_MODE: "dry-run",
    SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF: "test-project",
    SUPABASE_AUTH_CONFIG_APPLY_TARGET: "custom-domain",
    SUPABASE_AUTH_CONFIG_APPLY_DOMAIN_GATE_RESULT: "ready",
    SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuthConfig("https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app"),
  });

  assertIncludes(previewToCustomDryRunOutput, "supabase-auth-url-config-apply:DRY_RUN");
  assertIncludes(previewToCustomDryRunOutput, "from:preview-site-url");
  assertIncludes(previewToCustomDryRunOutput, "to:custom-domain-site-url");
  assertIncludes(previewToCustomDryRunOutput, "domain-gate:passed");

  const customToPreviewDryRunOutput = runApplyCommand({
    SUPABASE_AUTH_CONFIG_APPLY_MODE: "dry-run",
    SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF: "test-project",
    SUPABASE_AUTH_CONFIG_APPLY_TARGET: "preview",
    SUPABASE_AUTH_CONFIG_RESPONSE_JSON: createAuthConfig("https://admin.omaleima.fi"),
  });

  assertIncludes(customToPreviewDryRunOutput, "supabase-auth-url-config-apply:DRY_RUN");
  assertIncludes(customToPreviewDryRunOutput, "from:custom-domain-site-url");
  assertIncludes(customToPreviewDryRunOutput, "to:preview-site-url");

  const applyOutput = runApplyCommand({
    SUPABASE_AUTH_CONFIG_APPLY_MODE: "apply",
    SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF: "test-project",
    SUPABASE_AUTH_CONFIG_APPLY_TARGET: "custom-domain",
    SUPABASE_AUTH_CONFIG_APPLY_DOMAIN_GATE_RESULT: "ready",
    SUPABASE_AUTH_CONFIG_PATCH_RESPONSE_JSON: JSON.stringify({ ok: true }),
    SUPABASE_AUTH_CONFIG_RESPONSE_SEQUENCE_JSON: JSON.stringify([
      JSON.parse(createAuthConfig("https://omaleima-admin-c8iakx9r6-senol-dogans-projects.vercel.app")),
      JSON.parse(createAuthConfig("https://admin.omaleima.fi")),
    ]),
  });

  assertIncludes(applyOutput, "supabase-auth-url-config-apply:APPLIED");
  assertIncludes(applyOutput, "to:custom-domain-site-url");
  assertIncludes(applyOutput, "domain-gate:passed");
  assertIncludes(applyOutput, "google:enabled");

  console.log(
    "supabase-auth-apply-same-state:SUCCESS|supabase-auth-apply-gate-failure:SUCCESS|supabase-auth-apply-preview-to-custom-dry-run:SUCCESS|supabase-auth-apply-custom-to-preview-dry-run:SUCCESS|supabase-auth-apply-write-path:SUCCESS"
  );
};

void run();
