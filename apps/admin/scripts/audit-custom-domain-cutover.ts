import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve4, resolveCname } from "node:dns/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

const adminAppRoot = fileURLToPath(new URL("../", import.meta.url));

const projectLinkSchema = z.object({
  orgId: z.string().min(1, "Missing orgId in .vercel/project.json."),
  projectId: z.string().min(1, "Missing projectId in .vercel/project.json."),
  projectName: z.string().min(1, "Missing projectName in .vercel/project.json."),
});

const domainConfigSchema = z.object({
  misconfigured: z.boolean(),
  acceptedChallenges: z.array(z.unknown()),
  aValues: z.array(z.string()),
  cnames: z.array(z.string()),
  recommendedIPv4: z.array(
    z.object({
      rank: z.number(),
      value: z.array(z.string()),
    })
  ),
  recommendedCNAME: z.array(
    z.object({
      rank: z.number(),
      value: z.string(),
    })
  ),
});

const domainDetailsSchema = z.object({
  domain: z.object({
    name: z.string().min(1),
    configVerifiedAt: z.number().nullable(),
    verificationRecord: z.string().nullable().optional(),
  }),
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
type DomainConfig = z.infer<typeof domainConfigSchema>;
type DomainDetails = z.infer<typeof domainDetailsSchema>;

type DomainResolution = {
  aValues: string[];
  cnameValues: string[];
};

type ProductionDeploymentSummary = {
  readyState: string;
  target: string;
  url: string;
};

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

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

const parseCsvNames = (rawValue: string): string[] =>
  rawValue
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const readLinkedProject = (): ProjectLink => {
  const overrideProjectLinkPath = process.env.CUSTOM_DOMAIN_AUDIT_PROJECT_LINK_PATH;
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

const readDomainName = (): string => {
  const rawDomainName = process.env.CUSTOM_DOMAIN_AUDIT_DOMAIN;

  if (typeof rawDomainName === "string" && rawDomainName.trim().length > 0) {
    return rawDomainName.trim();
  }

  return "admin.omaleima.fi";
};

const readProductionDeploymentSummary = (projectLink: ProjectLink): ProductionDeploymentSummary => {
  const overrideSummaryJson = process.env.CUSTOM_DOMAIN_AUDIT_PRODUCTION_SUMMARY_JSON;

  if (typeof overrideSummaryJson === "string" && overrideSummaryJson.trim().length > 0) {
    return z.object({
      readyState: z.string(),
      target: z.string(),
      url: z.string(),
    }).parse(JSON.parse(overrideSummaryJson) as unknown);
  }

  const deploymentResult = runCommand(
    "vercel",
    [
      "api",
      `/v6/deployments?projectId=${projectLink.projectId}&target=production&limit=1`,
      "--scope",
      "senol-dogans-projects",
      "--raw",
    ],
    repoRoot
  );

  if (!deploymentResult.ok) {
    throw new Error(`Could not inspect latest production deployment for ${projectLink.projectName}: ${deploymentResult.error}`);
  }

  const parsedResponse = z.object({
    deployments: z.array(
      z.object({
        readyState: z.string(),
        target: z.string(),
        url: z.string(),
      })
    ),
  }).parse(JSON.parse(deploymentResult.stdout) as unknown);

  const latestDeployment = parsedResponse.deployments[0];

  if (latestDeployment === undefined) {
    throw new Error(`No production deployment found for ${projectLink.projectName}.`);
  }

  return latestDeployment;
};

const assertProductionReady = (deploymentSummary: ProductionDeploymentSummary, projectName: string): void => {
  if (deploymentSummary.target !== "production" || deploymentSummary.readyState !== "READY") {
    throw new Error(
      `Latest production deployment for ${projectName} is not ready yet. Run "vercel deploy --prod --cwd apps/admin --scope senol-dogans-projects" first.`
    );
  }
};

const readDomainConfig = (domainName: string): DomainConfig => {
  const overrideConfig = process.env.CUSTOM_DOMAIN_AUDIT_DOMAIN_CONFIG_JSON;

  if (typeof overrideConfig === "string" && overrideConfig.trim().length > 0) {
    return domainConfigSchema.parse(JSON.parse(overrideConfig) as unknown);
  }

  const configResult = runCommand(
    "vercel",
    ["api", `/v6/domains/${domainName}/config`, "--scope", "senol-dogans-projects", "--raw"],
    repoRoot
  );

  if (!configResult.ok) {
    throw new Error(`Could not read Vercel domain config for ${domainName}: ${configResult.error}`);
  }

  return domainConfigSchema.parse(JSON.parse(configResult.stdout) as unknown);
};

const readDomainDetails = (domainName: string): DomainDetails => {
  const overrideDetails = process.env.CUSTOM_DOMAIN_AUDIT_DOMAIN_DETAILS_JSON;

  if (typeof overrideDetails === "string" && overrideDetails.trim().length > 0) {
    return domainDetailsSchema.parse(JSON.parse(overrideDetails) as unknown);
  }

  const detailsResult = runCommand(
    "vercel",
    ["api", `/v6/domains/${domainName}`, "--scope", "senol-dogans-projects", "--raw"],
    repoRoot
  );

  if (!detailsResult.ok) {
    throw new Error(`Could not read Vercel domain details for ${domainName}: ${detailsResult.error}`);
  }

  return domainDetailsSchema.parse(JSON.parse(detailsResult.stdout) as unknown);
};

const readResolvedValues = async (domainName: string): Promise<DomainResolution> => {
  const overrideAValues = process.env.CUSTOM_DOMAIN_AUDIT_RESOLVED_A_VALUES;
  const overrideCnameValues = process.env.CUSTOM_DOMAIN_AUDIT_RESOLVED_CNAME_VALUES;

  if (typeof overrideAValues === "string" || typeof overrideCnameValues === "string") {
    return {
      aValues: typeof overrideAValues === "string" ? parseCsvNames(overrideAValues) : [],
      cnameValues: typeof overrideCnameValues === "string" ? parseCsvNames(overrideCnameValues) : [],
    };
  }

  const aValuesPromise = resolve4(domainName).catch(() => [] as string[]);
  const cnameValuesPromise = resolveCname(domainName).catch(() => [] as string[]);
  const [aValues, cnameValues] = await Promise.all([aValuesPromise, cnameValuesPromise]);

  return {
    aValues,
    cnameValues,
  };
};

const pickRecommendedAValue = (domainConfig: DomainConfig): string | null => {
  const flattenedValues = domainConfig.recommendedIPv4
    .flatMap((entry) => entry.value)
    .filter((value, index, allValues) => allValues.indexOf(value) === index);

  if (flattenedValues.includes("76.76.21.21")) {
    return "76.76.21.21";
  }

  return flattenedValues[0] ?? null;
};

const pickRecommendedCnameValue = (domainConfig: DomainConfig): string | null =>
  domainConfig.recommendedCNAME[0]?.value ?? null;

const assertDnsReady = (
  domainName: string,
  domainConfig: DomainConfig,
  domainResolution: DomainResolution
): void => {
  if (!domainConfig.misconfigured) {
    return;
  }

  const recommendedAValue = pickRecommendedAValue(domainConfig);
  const recommendedCnameValue = pickRecommendedCnameValue(domainConfig);

  if (recommendedAValue !== null) {
    throw new Error(
      `Custom domain ${domainName} is not ready yet. Set DNS record "A ${domainName} ${recommendedAValue}" and wait for verification. Current A values: ${domainResolution.aValues.join(",") || "none"}.`
    );
  }

  if (recommendedCnameValue !== null) {
    throw new Error(
      `Custom domain ${domainName} is not ready yet. Set DNS record "CNAME ${domainName} ${recommendedCnameValue}" and wait for verification. Current CNAME values: ${domainResolution.cnameValues.join(",") || "none"}.`
    );
  }

  throw new Error(`Custom domain ${domainName} is not ready yet and Vercel did not return a recommended DNS record.`);
};

const assertVercelVerification = (domainDetails: DomainDetails, domainName: string): void => {
  if (domainDetails.domain.configVerifiedAt === null) {
    throw new Error(
      `Custom domain ${domainName} is still waiting for Vercel verification. Do not switch Supabase Site URL until verification completes.`
    );
  }
};

const run = async (): Promise<void> => {
  const linkedProject = readLinkedProject();
  const domainName = readDomainName();
  const productionDeployment = readProductionDeploymentSummary(linkedProject);

  assertProductionReady(productionDeployment, linkedProject.projectName);

  const domainConfig = readDomainConfig(domainName);
  const domainDetails = readDomainDetails(domainName);
  const domainResolution = await readResolvedValues(domainName);

  assertDnsReady(domainName, domainConfig, domainResolution);
  assertVercelVerification(domainDetails, domainName);

  console.log(
    [
      "custom-domain-cutover:READY",
      `domain:${domainName}`,
      `project:${linkedProject.projectName}`,
      `production-url:${productionDeployment.url}`,
      `resolved-a:${domainResolution.aValues.join(",") || "none"}`,
      `resolved-cname:${domainResolution.cnameValues.join(",") || "none"}`,
      "next:switch-supabase-site-url-and-redirects",
    ].join("|")
  );
};

void run();
