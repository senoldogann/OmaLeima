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
      ["--prefix", "apps/admin", "run", "audit:custom-domain-cutover"],
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

    throw new Error(errorOutput.length > 0 ? errorOutput : "Custom-domain audit command failed without output.");
  }
};

const assertIncludes = (output: string, expectedSubstring: string): void => {
  if (!output.includes(expectedSubstring)) {
    throw new Error(`Expected output to include "${expectedSubstring}", got: ${output}`);
  }
};

const run = async (): Promise<void> => {
  const tempRoot = mkdtempSync(join(tmpdir(), "omaleima-custom-domain-audit-"));
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

  let productionNotReadyError = "";

  try {
    runAuditCommand({
      CUSTOM_DOMAIN_AUDIT_PROJECT_LINK_PATH: linkedProjectPath,
      CUSTOM_DOMAIN_AUDIT_DOMAIN: "admin.omaleima.fi",
      CUSTOM_DOMAIN_AUDIT_PRODUCTION_SUMMARY_JSON: JSON.stringify({
        readyState: "ERROR",
        target: "production",
        url: "https://omaleima-admin.vercel.app",
      }),
      CUSTOM_DOMAIN_AUDIT_DOMAIN_CONFIG_JSON: JSON.stringify({
        misconfigured: true,
        acceptedChallenges: [],
        aValues: [],
        cnames: [],
        recommendedIPv4: [{ rank: 2, value: ["76.76.21.21"] }],
        recommendedCNAME: [],
      }),
      CUSTOM_DOMAIN_AUDIT_DOMAIN_DETAILS_JSON: JSON.stringify({
        domain: {
          name: "omaleima.fi",
          configVerifiedAt: null,
          intendedNameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
          nameservers: [],
          verificationRecord: "token",
        },
      }),
      CUSTOM_DOMAIN_AUDIT_RESOLVED_A_VALUES: "",
      CUSTOM_DOMAIN_AUDIT_RESOLVED_CNAME_VALUES: "",
    });
  } catch (error) {
    productionNotReadyError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(productionNotReadyError, "Latest production deployment for omaleima-admin is not ready yet");

  let dnsPendingError = "";

  try {
    runAuditCommand({
      CUSTOM_DOMAIN_AUDIT_PROJECT_LINK_PATH: linkedProjectPath,
      CUSTOM_DOMAIN_AUDIT_DOMAIN: "admin.omaleima.fi",
      CUSTOM_DOMAIN_AUDIT_PRODUCTION_SUMMARY_JSON: JSON.stringify({
        readyState: "READY",
        target: "production",
        url: "https://omaleima-admin.vercel.app",
      }),
      CUSTOM_DOMAIN_AUDIT_DOMAIN_CONFIG_JSON: JSON.stringify({
        misconfigured: true,
        acceptedChallenges: [],
        aValues: [],
        cnames: [],
        recommendedIPv4: [{ rank: 2, value: ["76.76.21.21"] }],
        recommendedCNAME: [],
      }),
      CUSTOM_DOMAIN_AUDIT_DOMAIN_DETAILS_JSON: JSON.stringify({
        domain: {
          name: "omaleima.fi",
          configVerifiedAt: null,
          intendedNameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
          nameservers: [],
          verificationRecord: "token",
        },
      }),
      CUSTOM_DOMAIN_AUDIT_RESOLVED_A_VALUES: "",
      CUSTOM_DOMAIN_AUDIT_RESOLVED_CNAME_VALUES: "",
    });
  } catch (error) {
    dnsPendingError = error instanceof Error ? error.message : String(error);
  }

  assertIncludes(dnsPendingError, 'Either set DNS record "A admin.omaleima.fi 76.76.21.21"');
  assertIncludes(dnsPendingError, "delegate the domain to Vercel nameservers (ns1.vercel-dns.com, ns2.vercel-dns.com)");

  const successOutput = runAuditCommand({
    CUSTOM_DOMAIN_AUDIT_PROJECT_LINK_PATH: linkedProjectPath,
    CUSTOM_DOMAIN_AUDIT_DOMAIN: "admin.omaleima.fi",
    CUSTOM_DOMAIN_AUDIT_PRODUCTION_SUMMARY_JSON: JSON.stringify({
      readyState: "READY",
      target: "production",
      url: "https://omaleima-admin.vercel.app",
    }),
    CUSTOM_DOMAIN_AUDIT_DOMAIN_CONFIG_JSON: JSON.stringify({
      misconfigured: false,
      acceptedChallenges: [],
      aValues: ["76.76.21.21"],
      cnames: [],
      recommendedIPv4: [{ rank: 2, value: ["76.76.21.21"] }],
      recommendedCNAME: [],
    }),
    CUSTOM_DOMAIN_AUDIT_DOMAIN_DETAILS_JSON: JSON.stringify({
      domain: {
        name: "omaleima.fi",
        configVerifiedAt: 1777395000000,
        intendedNameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
        nameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
        verificationRecord: "token",
      },
    }),
    CUSTOM_DOMAIN_AUDIT_RESOLVED_A_VALUES: "76.76.21.21",
    CUSTOM_DOMAIN_AUDIT_RESOLVED_CNAME_VALUES: "",
  });

  assertIncludes(successOutput, "custom-domain-cutover:READY");
  assertIncludes(successOutput, "domain:admin.omaleima.fi");
  assertIncludes(successOutput, "next:switch-supabase-site-url-and-redirects");

  console.log(
    "custom-domain-audit-production-error:SUCCESS|custom-domain-audit-dns-pending:SUCCESS|custom-domain-audit-ready:SUCCESS"
  );
};

void run();
