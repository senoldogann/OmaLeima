import { execFileSync } from "node:child_process";
import { stat } from "node:fs/promises";

import {
  defaultPilotOperatorCredentialPath,
  readPilotOperatorCredentialsAsync,
  type PilotOperatorCredentialMap,
  type PilotOperatorKey,
} from "./_shared/pilot-operator-credentials";

const repoName = "senoldogann/OmaLeima";
const requiredGithubSecrets = [
  "STAGING_ADMIN_EMAIL",
  "STAGING_ADMIN_PASSWORD",
  "VERCEL_AUTOMATION_BYPASS_SECRET",
] as const;
const weakPasswordValues = new Set([
  "12345678",
  "admin123",
  "changeme",
  "letmein",
  "password",
  "password123",
  "qwerty123",
  "secret",
]);
const minimumPasswordLength = 20;

type GithubSecretRow = {
  name: string;
};

type CredentialIssue = {
  key: PilotOperatorKey;
  message: string;
};

const formatMode = (mode: number): string => (mode & 0o777).toString(8).padStart(3, "0");

const isStrictOwnerOnlyMode = (mode: number): boolean => {
  const permissionBits = mode & 0o777;

  return permissionBits === 0o600;
};

const hasPasswordComplexity = (password: string): boolean =>
  /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password);

const readOverrideGithubSecrets = (): GithubSecretRow[] | null => {
  const rawValue = process.env.PILOT_SECRET_HYGIENE_GITHUB_SECRETS_JSON;

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  const parsedValue = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsedValue)) {
    throw new Error("PILOT_SECRET_HYGIENE_GITHUB_SECRETS_JSON must be a JSON array.");
  }

  return parsedValue.map((row) => {
    if (typeof row !== "object" || row === null || typeof row.name !== "string") {
      throw new Error("PILOT_SECRET_HYGIENE_GITHUB_SECRETS_JSON contains an invalid row.");
    }

    return {
      name: row.name,
    };
  });
};

const readGithubSecretRows = (): GithubSecretRow[] => {
  const overrideRows = readOverrideGithubSecrets();

  if (overrideRows !== null) {
    return overrideRows;
  }

  try {
    return JSON.parse(
      execFileSync("gh", ["secret", "list", "--repo", repoName, "--json", "name"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      })
    ) as GithubSecretRow[];
  } catch (error) {
    const stderr = error instanceof Error && "stderr" in error ? String(error.stderr).trim() : "";
    const stdout = error instanceof Error && "stdout" in error ? String(error.stdout).trim() : "";
    const errorOutput = stderr.length > 0 ? stderr : stdout;

    throw new Error(
      errorOutput.length > 0
        ? `Failed to read GitHub secret names for ${repoName}. ${errorOutput}`
        : `Failed to read GitHub secret names for ${repoName}.`
    );
  }
};

const collectCredentialIssues = (credentials: PilotOperatorCredentialMap): CredentialIssue[] => {
  const issues: CredentialIssue[] = [];
  const emailOwners = new Map<string, PilotOperatorKey>();
  const passwordOwners = new Map<string, PilotOperatorKey>();

  for (const [key, credential] of Object.entries(credentials) as [PilotOperatorKey, PilotOperatorCredentialMap[PilotOperatorKey]][]) {
    const normalizedEmail = credential.email.trim().toLowerCase();
    const duplicateEmailOwner = emailOwners.get(normalizedEmail);

    if (duplicateEmailOwner !== undefined) {
      issues.push({
        key,
        message: `duplicate-email-with-${duplicateEmailOwner.toLowerCase()}`,
      });
    } else {
      emailOwners.set(normalizedEmail, key);
    }

    const duplicatePasswordOwner = passwordOwners.get(credential.password);

    if (duplicatePasswordOwner !== undefined) {
      issues.push({
        key,
        message: `duplicate-password-with-${duplicatePasswordOwner.toLowerCase()}`,
      });
    } else {
      passwordOwners.set(credential.password, key);
    }

    if (credential.password.length < minimumPasswordLength) {
      issues.push({
        key,
        message: `password-too-short-${credential.password.length}`,
      });
    }

    if (weakPasswordValues.has(credential.password.toLowerCase())) {
      issues.push({
        key,
        message: "password-is-weak-known-value",
      });
    }

    if (!hasPasswordComplexity(credential.password)) {
      issues.push({
        key,
        message: "password-missing-complexity",
      });
    }

    if (credential.email.trim().toLowerCase().endsWith("@omaleima.test")) {
      issues.push({
        key,
        message: "test-domain-email-still-in-use",
      });
    }
  }

  return issues;
};

const run = async (): Promise<void> => {
  const credentialFilePath = defaultPilotOperatorCredentialPath;
  const [credentialFileStat, credentials] = await Promise.all([
    stat(credentialFilePath),
    readPilotOperatorCredentialsAsync(credentialFilePath),
  ]);
  const githubSecretRows = readGithubSecretRows();
  const githubSecretNames = new Set(githubSecretRows.map((row) => row.name));
  const credentialIssues = collectCredentialIssues(credentials);
  const missingGithubSecrets = requiredGithubSecrets.filter((secretName) => !githubSecretNames.has(secretName));
  const mode = credentialFileStat.mode & 0o777;

  if (!isStrictOwnerOnlyMode(credentialFileStat.mode) || credentialIssues.length > 0 || missingGithubSecrets.length > 0) {
    const issueParts = credentialIssues.map((issue) => `${issue.key.toLowerCase()}:${issue.message}`);

    throw new Error(
      [
        "Pilot secret hygiene is not ready.",
        `credential-file=${credentialFilePath}`,
        `credential-file-mode=${formatMode(credentialFileStat.mode)}`,
        `mode-ready=${isStrictOwnerOnlyMode(credentialFileStat.mode)}`,
        `credential-issues=${issueParts.length > 0 ? issueParts.join(",") : "none"}`,
        `missing-github-secrets=${missingGithubSecrets.length > 0 ? missingGithubSecrets.join(",") : "none"}`,
        "next=fix-credential-file-permissions-rotate-weak-passwords-and-verify-secret-names",
      ].join(" ")
    );
  }

  console.log(
    [
      "pilot-secret-hygiene:READY",
      `credential-file:${credentialFilePath}`,
      `credential-file-mode:${formatMode(mode)}`,
      `credentials:${Object.keys(credentials).length}`,
      `github-secrets:${requiredGithubSecrets.length}/${requiredGithubSecrets.length}`,
      "next:keep-private-pilot-operator-material-in-a-secure-vault",
    ].join("|")
  );
};

void run();
