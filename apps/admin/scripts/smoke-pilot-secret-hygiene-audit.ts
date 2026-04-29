import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));
const npmBinary = process.env.NPM_BINARY ?? "npm";

type AuditEnvironment = Record<string, string>;

const runAuditCommand = (environmentVariables: AuditEnvironment): string => {
  try {
    return execFileSync(npmBinary, ["--prefix", "apps/admin", "run", "audit:pilot-secret-hygiene"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        ...environmentVariables,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    const stdout = error instanceof Error && "stdout" in error ? String(error.stdout).trim() : "";
    const errorOutput = stderr.length > 0 ? stderr : stdout;

    throw new Error(errorOutput.length > 0 ? errorOutput : "Pilot secret hygiene audit failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const createCredentialFile = (filePath: string, passwords: Record<"admin" | "organizer" | "scanner", string>): void => {
  writeFileSync(
    filePath,
    [
      "OmaLeima pilot operator accounts",
      "",
      "Admin email: pilot-admin@example.com",
      `Admin password: ${passwords.admin}`,
      "",
      "Organizer email: pilot-organizer@example.com",
      `Organizer password: ${passwords.organizer}`,
      "",
      "Scanner email: pilot-scanner@example.com",
      `Scanner password: ${passwords.scanner}`,
      "",
    ].join("\n"),
    "utf8"
  );
};

const run = async (): Promise<void> => {
  const tempDirectory = mkdtempSync(join(tmpdir(), "omaleima-pilot-secret-hygiene-"));
  const failureFilePath = join(tempDirectory, "failure-credentials.txt");
  const successFilePath = join(tempDirectory, "success-credentials.txt");

  try {
    createCredentialFile(failureFilePath, {
      admin: "password123",
      organizer: "password123",
      scanner: "password123",
    });
    chmodSync(failureFilePath, 0o644);

    const failingOutput = (() => {
      try {
        runAuditCommand({
          PILOT_OPERATOR_BOOTSTRAP_OUTPUT_PATH: failureFilePath,
          PILOT_SECRET_HYGIENE_GITHUB_SECRETS_JSON: JSON.stringify([
            {
              name: "STAGING_ADMIN_EMAIL",
            },
          ]),
        });
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    })();

    assertIncludes(failingOutput, "Pilot secret hygiene is not ready");
    assertIncludes(failingOutput, `credential-file=${failureFilePath}`);
    assertIncludes(failingOutput, "credential-file-mode=644");
    assertIncludes(failingOutput, "mode-ready=false");
    assertIncludes(failingOutput, "admin:password-too-short-11");
    assertIncludes(failingOutput, "organizer:duplicate-password-with-admin");
    assertIncludes(failingOutput, "scanner:duplicate-password-with-admin");
    assertIncludes(failingOutput, "missing-github-secrets=STAGING_ADMIN_PASSWORD,VERCEL_AUTOMATION_BYPASS_SECRET");

    createCredentialFile(successFilePath, {
      admin: "Pilot.Admin!9g4Pq7TxMv2Za",
      organizer: "Pilot.Org!7m3Rx6UwKp8Ld",
      scanner: "Pilot.Scan!5n2Cy4VqHs9Jt",
    });
    chmodSync(successFilePath, 0o600);

    const successOutput = runAuditCommand({
      PILOT_OPERATOR_BOOTSTRAP_OUTPUT_PATH: successFilePath,
      PILOT_SECRET_HYGIENE_GITHUB_SECRETS_JSON: JSON.stringify([
        {
          name: "STAGING_ADMIN_EMAIL",
        },
        {
          name: "STAGING_ADMIN_PASSWORD",
        },
        {
          name: "VERCEL_AUTOMATION_BYPASS_SECRET",
        },
      ]),
    });

    assertIncludes(successOutput, "pilot-secret-hygiene:READY");
    assertIncludes(successOutput, `credential-file:${successFilePath}`);
    assertIncludes(successOutput, "credential-file-mode:600");
    assertIncludes(successOutput, "github-secrets:3/3");

    console.log("pilot-secret-hygiene-audit-failure:SUCCESS|pilot-secret-hygiene-audit-ready:SUCCESS");
  } finally {
    rmSync(tempDirectory, {
      force: true,
      recursive: true,
    });
  }
};

void run();
