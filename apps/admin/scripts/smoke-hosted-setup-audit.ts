import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

type AuditEnvironment = Record<string, string>;

const runAuditCommand = (environmentVariables: AuditEnvironment): string => {
  try {
    return execFileSync(
      npmBinary,
      ["--prefix", "apps/admin", "run", "audit:hosted-setup"],
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

    throw new Error(errorOutput.length > 0 ? errorOutput : "Hosted admin audit command failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const run = async (): Promise<void> => {
  const tempRoot = mkdtempSync(join(tmpdir(), "omaleima-hosted-audit-"));
  const linkedProjectDirectory = join(tempRoot, ".vercel");
  const linkedProjectPath = join(linkedProjectDirectory, "project.json");

  mkdirSync(linkedProjectDirectory, {
    recursive: true,
  });

  writeFileSync(
    linkedProjectPath,
    JSON.stringify({
      orgId: "team_personal",
      projectId: "prj_admin_test",
      projectName: "omaleima-admin",
    })
  );

  let missingLinkError = "";

  try {
    runAuditCommand({
      HOSTED_ADMIN_AUDIT_REPO: "senoldogann/OmaLeima",
      HOSTED_ADMIN_AUDIT_VERCEL_WHOAMI: "senoldogan0233-7591",
      HOSTED_ADMIN_AUDIT_GITHUB_LOGIN: "senoldogann",
      HOSTED_ADMIN_AUDIT_PROJECT_LINK_PATH: join(tempRoot, "missing-project.json"),
    });
  } catch (error) {
    missingLinkError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(missingLinkError, "Missing linked Vercel project");

  let missingBypassSecretError = "";

  try {
    runAuditCommand({
      HOSTED_ADMIN_AUDIT_REPO: "senoldogann/OmaLeima",
      HOSTED_ADMIN_AUDIT_VERCEL_WHOAMI: "senoldogan0233-7591",
      HOSTED_ADMIN_AUDIT_GITHUB_LOGIN: "senoldogann",
      HOSTED_ADMIN_AUDIT_PROJECT_LINK_PATH: linkedProjectPath,
      HOSTED_ADMIN_AUDIT_PROTECTION_STATE: "requires-bypass",
      HOSTED_ADMIN_AUDIT_VERCEL_PREVIEW_ENV_NAMES: "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      HOSTED_ADMIN_AUDIT_VERCEL_PRODUCTION_ENV_NAMES: "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      HOSTED_ADMIN_AUDIT_ACTION_SECRET_NAMES: "STAGING_ADMIN_EMAIL,STAGING_ADMIN_PASSWORD",
    });
  } catch (error) {
    missingBypassSecretError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(missingBypassSecretError, "Missing GitHub Actions secrets: VERCEL_AUTOMATION_BYPASS_SECRET");

  const successOutput = runAuditCommand({
    HOSTED_ADMIN_AUDIT_REPO: "senoldogann/OmaLeima",
    HOSTED_ADMIN_AUDIT_VERCEL_WHOAMI: "senoldogan0233-7591",
    HOSTED_ADMIN_AUDIT_GITHUB_LOGIN: "senoldogann",
    HOSTED_ADMIN_AUDIT_PROJECT_LINK_PATH: linkedProjectPath,
    HOSTED_ADMIN_AUDIT_PROTECTION_STATE: "requires-bypass",
    HOSTED_ADMIN_AUDIT_VERCEL_PREVIEW_ENV_NAMES: "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    HOSTED_ADMIN_AUDIT_VERCEL_PRODUCTION_ENV_NAMES: "NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    HOSTED_ADMIN_AUDIT_ACTION_SECRET_NAMES:
      "STAGING_ADMIN_EMAIL,STAGING_ADMIN_PASSWORD,VERCEL_AUTOMATION_BYPASS_SECRET",
  });

  assertIncludes(successOutput, "hosted-admin-readiness:READY");
  assertIncludes(successOutput, "project-id:prj_admin_test");
  assertIncludes(successOutput, "protection-bypass-required:yes");

  console.log(
    "hosted-admin-audit-missing-link:SUCCESS|hosted-admin-audit-missing-bypass:SUCCESS|hosted-admin-audit-ready:SUCCESS"
  );
};

void run();
