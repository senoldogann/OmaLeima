import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const adminAppRoot = fileURLToPath(new URL("../", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

const requiredActionsSecrets = [
  "STAGING_ADMIN_EMAIL",
  "STAGING_ADMIN_PASSWORD",
] as const;

const protectionBypassSecretName = "VERCEL_AUTOMATION_BYPASS_SECRET";

const requiredVercelEnvNames = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

const projectLinkSchema = z.object({
  orgId: z.string().min(1, "Missing orgId in .vercel/project.json."),
  projectId: z.string().min(1, "Missing projectId in .vercel/project.json."),
  projectName: z.string().min(1).optional(),
});

type CommandSuccess = {
  ok: true;
  stdout: string;
};

type CommandFailure = {
  ok: false;
  error: string;
};

type CommandResult = CommandSuccess | CommandFailure;

type ProjectLink = z.infer<typeof projectLinkSchema>;

type ReadinessState = {
  actionsSecretNames: string[];
  githubLogin: string;
  linkedProject: ProjectLink;
  previewEnvNames: string[];
  productionEnvNames: string[];
  requiresProtectionBypassSecret: boolean;
  repoSlug: string;
  vercelUser: string;
};

type ProjectProtectionState = {
  requiresBypassSecret: boolean;
};

const parseCsvNames = (rawValue: string): string[] =>
  rawValue
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const readOverrideNames = (environmentVariableName: string): string[] | null => {
  const rawValue = process.env[environmentVariableName];

  if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
    return null;
  }

  return parseCsvNames(rawValue);
};

const runCommand = (command: string, args: string[], cwd: string): CommandResult => {
  const commandResult = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (commandResult.status === 0) {
    return {
      ok: true,
      stdout: commandResult.stdout.trim(),
    };
  }

  const stderr = commandResult.stderr.trim();
  const stdout = commandResult.stdout.trim();
  const errorOutput = stderr.length > 0 ? stderr : stdout;

  return {
    ok: false,
    error: errorOutput.length > 0 ? errorOutput : `Command exited with status ${commandResult.status ?? "unknown"}.`,
  };
};

const parseRepoSlug = (remoteUrl: string): string => {
  const normalizedRemoteUrl = remoteUrl.trim();
  const sshMatch = normalizedRemoteUrl.match(/^git@github\.com:(.+?)(?:\.git)?$/u);

  if (sshMatch?.[1]) {
    return sshMatch[1];
  }

  const httpsMatch = normalizedRemoteUrl.match(/^https:\/\/github\.com\/(.+?)(?:\.git)?$/u);

  if (httpsMatch?.[1]) {
    return httpsMatch[1];
  }

  throw new Error(`Could not parse GitHub repo slug from remote.origin.url: ${normalizedRemoteUrl}`);
};

const readRepoSlug = (): string => {
  const overrideRepoSlug = process.env.HOSTED_ADMIN_AUDIT_REPO;

  if (typeof overrideRepoSlug === "string" && overrideRepoSlug.trim().length > 0) {
    return overrideRepoSlug.trim();
  }

  const gitRemoteResult = runCommand("git", ["config", "--get", "remote.origin.url"], repoRoot);

  if (!gitRemoteResult.ok) {
    throw new Error(`Could not read git remote origin for hosted admin audit: ${gitRemoteResult.error}`);
  }

  return parseRepoSlug(gitRemoteResult.stdout);
};

const readVercelUser = (): string => {
  const overrideVercelUser = process.env.HOSTED_ADMIN_AUDIT_VERCEL_WHOAMI;

  if (typeof overrideVercelUser === "string" && overrideVercelUser.trim().length > 0) {
    return overrideVercelUser.trim();
  }

  const vercelWhoamiResult = runCommand("vercel", ["whoami"], repoRoot);

  if (!vercelWhoamiResult.ok) {
    throw new Error(`Vercel CLI is not ready for hosted admin audit: ${vercelWhoamiResult.error}`);
  }

  return vercelWhoamiResult.stdout;
};

const readGitHubLogin = (): string => {
  const overrideGitHubLogin = process.env.HOSTED_ADMIN_AUDIT_GITHUB_LOGIN;

  if (typeof overrideGitHubLogin === "string" && overrideGitHubLogin.trim().length > 0) {
    return overrideGitHubLogin.trim();
  }

  const gitHubUserResult = runCommand("gh", ["api", "user", "--jq", ".login"], repoRoot);

  if (!gitHubUserResult.ok) {
    throw new Error(`GitHub CLI is not ready for hosted admin audit: ${gitHubUserResult.error}`);
  }

  return gitHubUserResult.stdout;
};

const readLinkedProject = (): ProjectLink => {
  const overrideProjectLinkPath = process.env.HOSTED_ADMIN_AUDIT_PROJECT_LINK_PATH;
  const projectLinkPath = typeof overrideProjectLinkPath === "string" && overrideProjectLinkPath.length > 0
    ? overrideProjectLinkPath
    : resolve(adminAppRoot, ".vercel/project.json");

  if (!existsSync(projectLinkPath)) {
    throw new Error(
      `Missing linked Vercel project at ${projectLinkPath}. Run "vercel link --cwd apps/admin --project <project-name> --yes" first.`
    );
  }

  const projectLink = JSON.parse(readFileSync(projectLinkPath, "utf8")) as unknown;

  return projectLinkSchema.parse(projectLink);
};

const extractEnvNames = (input: unknown): string[] => {
  if (Array.isArray(input)) {
    return input.flatMap(extractEnvNames);
  }

  if (input === null || typeof input !== "object") {
    return [];
  }

  const record = input as Record<string, unknown>;
  const currentNames: string[] = [];

  if (typeof record.key === "string" && record.key.length > 0) {
    currentNames.push(record.key);
  }

  if (typeof record.name === "string" && record.name.length > 0) {
    currentNames.push(record.name);
  }

  return [
    ...currentNames,
    ...Object.values(record).flatMap(extractEnvNames),
  ];
};

const readVercelEnvironmentNames = (environmentName: "preview" | "production"): string[] => {
  const overrideVariableName = environmentName === "preview"
    ? "HOSTED_ADMIN_AUDIT_VERCEL_PREVIEW_ENV_NAMES"
    : "HOSTED_ADMIN_AUDIT_VERCEL_PRODUCTION_ENV_NAMES";
  const overrideNames = readOverrideNames(overrideVariableName);

  if (overrideNames !== null) {
    return overrideNames;
  }

  const vercelEnvResult = runCommand(
    "vercel",
    ["env", "ls", environmentName, "--format", "json", "--cwd", "apps/admin"],
    repoRoot
  );

  if (!vercelEnvResult.ok) {
    throw new Error(`Could not read Vercel ${environmentName} env vars for hosted admin audit: ${vercelEnvResult.error}`);
  }

  const parsedEnvListing = JSON.parse(vercelEnvResult.stdout) as unknown;
  const envNames = Array.from(new Set(extractEnvNames(parsedEnvListing)));

  if (envNames.length === 0) {
    throw new Error(`Vercel ${environmentName} env listing returned no readable variable names.`);
  }

  return envNames;
};

const readGitHubActionsSecretNames = (repoSlug: string): string[] => {
  const overrideSecretNames = readOverrideNames("HOSTED_ADMIN_AUDIT_ACTION_SECRET_NAMES");

  if (overrideSecretNames !== null) {
    return overrideSecretNames;
  }

  const gitHubSecretsResult = runCommand(
    "gh",
    ["secret", "list", "--app", "actions", "--repo", repoSlug, "--json", "name"],
    repoRoot
  );

  if (!gitHubSecretsResult.ok) {
    throw new Error(`Could not read GitHub Actions secrets for hosted admin audit: ${gitHubSecretsResult.error}`);
  }

  const parsedSecrets = JSON.parse(gitHubSecretsResult.stdout) as unknown;
  const secretNames = extractEnvNames(parsedSecrets);

  return Array.from(new Set(secretNames));
};

const readProjectProtectionState = (projectNameOrId: string): ProjectProtectionState => {
  const overrideProtectionState = process.env.HOSTED_ADMIN_AUDIT_PROTECTION_STATE;

  if (overrideProtectionState === "requires-bypass") {
    return {
      requiresBypassSecret: true,
    };
  }

  if (overrideProtectionState === "no-bypass") {
    return {
      requiresBypassSecret: false,
    };
  }

  const projectProtectionResult = runCommand(
    "vercel",
    ["project", "protection", projectNameOrId, "--format", "json", "--cwd", "apps/admin"],
    repoRoot
  );

  if (!projectProtectionResult.ok) {
    throw new Error(`Could not read Vercel project protection for hosted admin audit: ${projectProtectionResult.error}`);
  }

  const protectionState = JSON.parse(projectProtectionResult.stdout) as {
    ssoProtection?: {
      deploymentType?: string;
    };
  };

  return {
    requiresBypassSecret:
      typeof protectionState.ssoProtection?.deploymentType === "string" &&
      protectionState.ssoProtection.deploymentType.length > 0,
  };
};

const findMissingNames = (requiredNames: readonly string[], actualNames: string[]): string[] =>
  requiredNames.filter((requiredName) => !actualNames.includes(requiredName));

const buildReadinessState = (): ReadinessState => {
  const repoSlug = readRepoSlug();
  const vercelUser = readVercelUser();
  const githubLogin = readGitHubLogin();
  const linkedProject = readLinkedProject();
  const previewEnvNames = readVercelEnvironmentNames("preview");
  const productionEnvNames = readVercelEnvironmentNames("production");
  const actionsSecretNames = readGitHubActionsSecretNames(repoSlug);
  const protectionState = readProjectProtectionState(linkedProject.projectName ?? linkedProject.projectId);

  const missingPreviewEnvNames = findMissingNames(requiredVercelEnvNames, previewEnvNames);

  if (missingPreviewEnvNames.length > 0) {
    throw new Error(`Missing Vercel Preview env vars: ${missingPreviewEnvNames.join(", ")}`);
  }

  const missingProductionEnvNames = findMissingNames(requiredVercelEnvNames, productionEnvNames);

  if (missingProductionEnvNames.length > 0) {
    throw new Error(`Missing Vercel Production env vars: ${missingProductionEnvNames.join(", ")}`);
  }

  const requiredSecretNames = protectionState.requiresBypassSecret
    ? [...requiredActionsSecrets, protectionBypassSecretName]
    : [...requiredActionsSecrets];
  const missingActionsSecrets = findMissingNames(requiredSecretNames, actionsSecretNames);

  if (missingActionsSecrets.length > 0) {
    throw new Error(`Missing GitHub Actions secrets: ${missingActionsSecrets.join(", ")}`);
  }

  return {
    actionsSecretNames,
    githubLogin,
    linkedProject,
    previewEnvNames,
    productionEnvNames,
    requiresProtectionBypassSecret: protectionState.requiresBypassSecret,
    repoSlug,
    vercelUser,
  };
};

const run = async (): Promise<void> => {
  const readinessState = buildReadinessState();

  console.log(
    [
      "hosted-admin-readiness:READY",
      `repo:${readinessState.repoSlug}`,
      `vercel-user:${readinessState.vercelUser}`,
      `github-user:${readinessState.githubLogin}`,
      `project-id:${readinessState.linkedProject.projectId}`,
      `project-name:${readinessState.linkedProject.projectName ?? "unknown"}`,
      `preview-env-count:${readinessState.previewEnvNames.length}`,
      `production-env-count:${readinessState.productionEnvNames.length}`,
      `actions-secret-count:${readinessState.actionsSecretNames.length}`,
      `protection-bypass-required:${readinessState.requiresProtectionBypassSecret ? "yes" : "no"}`,
    ].join("|")
  );
};

void run();
