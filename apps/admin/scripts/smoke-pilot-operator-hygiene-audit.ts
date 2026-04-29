import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

type AuditEnvironment = Record<string, string>;

const runAuditCommand = (environmentVariables: AuditEnvironment): string => {
  try {
    return execFileSync(
      npmBinary,
      ["--prefix", "apps/admin", "run", "audit:pilot-operator-hygiene"],
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

    throw new Error(errorOutput.length > 0 ? errorOutput : "Pilot operator hygiene audit failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const run = async (): Promise<void> => {
  const failingOutput = (() => {
    try {
      runAuditCommand({
        PILOT_OPERATOR_AUDIT_PROJECT_REF: "fixture-project",
        PILOT_OPERATOR_AUDIT_SUPABASE_URL: "https://fixture-project.supabase.co",
        PILOT_OPERATOR_AUDIT_AUTH_USERS_JSON: JSON.stringify([
          {
            email: "organizer@omaleima.test",
            id: "user-organizer",
          },
          {
            email: "real-owner@example.com",
            id: "user-real-owner",
          },
        ]),
        PILOT_OPERATOR_AUDIT_PROFILES_JSON: JSON.stringify([
          {
            id: "user-organizer",
            primary_role: "CLUB_ORGANIZER",
            status: "ACTIVE",
          },
        ]),
        PILOT_OPERATOR_AUDIT_BUSINESS_STAFF_JSON: JSON.stringify([]),
        PILOT_OPERATOR_AUDIT_CLUB_MEMBERS_JSON: JSON.stringify([
          {
            club_id: "club-test",
            role: "ORGANIZER",
            status: "ACTIVE",
            user_id: "user-organizer",
          },
        ]),
      });
      return "";
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  })();

  assertIncludes(failingOutput, "Hosted pilot operator hygiene is not ready");
  assertIncludes(failingOutput, "fixture-auth-users=organizer@omaleima.test:user-organizer");
  assertIncludes(failingOutput, "fixture-active-memberships=organizer@omaleima.test:club:club-test:ORGANIZER");
  assertIncludes(failingOutput, "next=replace-or-disable-smoke-accounts-and-rerun-audit");

  const successOutput = runAuditCommand({
    PILOT_OPERATOR_AUDIT_PROJECT_REF: "fixture-project",
    PILOT_OPERATOR_AUDIT_SUPABASE_URL: "https://fixture-project.supabase.co",
    PILOT_OPERATOR_AUDIT_AUTH_USERS_JSON: JSON.stringify([
      {
        email: "pilot-owner@example.com",
        id: "user-owner",
      },
      {
        email: "pilot-scanner@example.com",
        id: "user-scanner",
      },
    ]),
    PILOT_OPERATOR_AUDIT_PROFILES_JSON: JSON.stringify([
      {
        id: "user-owner",
        primary_role: "CLUB_ORGANIZER",
        status: "ACTIVE",
      },
      {
        id: "user-scanner",
        primary_role: "BUSINESS_STAFF",
        status: "ACTIVE",
      },
    ]),
    PILOT_OPERATOR_AUDIT_BUSINESS_STAFF_JSON: JSON.stringify([
      {
        business_id: "business-test",
        role: "SCANNER",
        status: "ACTIVE",
        user_id: "user-scanner",
      },
    ]),
    PILOT_OPERATOR_AUDIT_CLUB_MEMBERS_JSON: JSON.stringify([
      {
        club_id: "club-test",
        role: "ORGANIZER",
        status: "ACTIVE",
        user_id: "user-owner",
      },
    ]),
  });

  assertIncludes(successOutput, "pilot-operator-hygiene:READY");
  assertIncludes(successOutput, "fixture-auth-users:0");
  assertIncludes(successOutput, "fixture-active-memberships:0");
  assertIncludes(successOutput, "next:run-real-pilot-dry-run");

  console.log("pilot-operator-hygiene-audit-failure:SUCCESS|pilot-operator-hygiene-audit-ready:SUCCESS");
};

void run();
