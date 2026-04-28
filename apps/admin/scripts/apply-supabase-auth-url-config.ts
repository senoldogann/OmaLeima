import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  assertTargetStateReachedAsync,
  assertGoogleOAuthState,
  assertRequiredRedirectUrls,
  buildManagedAuthConfigPatch,
  fetchAuthConfig,
  patchAuthConfig,
  readProjectRef,
  resolveSiteUrlState,
  targetToState,
  type AuthConfigTarget,
} from "./_shared/supabase-auth-config";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

type ApplyMode = "dry-run" | "apply";

const readApplyMode = (): ApplyMode => {
  const rawMode = process.env.SUPABASE_AUTH_CONFIG_APPLY_MODE;

  if (rawMode === "dry-run" || rawMode === "apply") {
    return rawMode;
  }

  throw new Error('Set SUPABASE_AUTH_CONFIG_APPLY_MODE to either "dry-run" or "apply".');
};

const readTarget = (): AuthConfigTarget => {
  const rawTarget = process.env.SUPABASE_AUTH_CONFIG_APPLY_TARGET;

  if (rawTarget === "preview" || rawTarget === "custom-domain") {
    return rawTarget;
  }

  throw new Error('Set SUPABASE_AUTH_CONFIG_APPLY_TARGET to either "preview" or "custom-domain".');
};

const runCustomDomainGate = (): string => {
  const overrideResult = process.env.SUPABASE_AUTH_CONFIG_APPLY_DOMAIN_GATE_RESULT;

  if (overrideResult === "ready") {
    return "custom-domain-cutover:READY|override:yes";
  }

  if (overrideResult === "fail") {
    throw new Error(
      "Custom domain readiness gate is not green yet. Run `npm --prefix apps/admin run audit:custom-domain-cutover` and wait for READY before applying the custom-domain site URL."
    );
  }

  const commandResult = spawnSync(
    "npm",
    ["--prefix", "apps/admin", "run", "audit:custom-domain-cutover"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  if (commandResult.status !== 0) {
    const stderr = commandResult.stderr.trim();
    const stdout = commandResult.stdout.trim();
    const errorOutput = stderr.length > 0 ? stderr : stdout;

    throw new Error(
      `Custom domain readiness gate is not green yet. Run \`npm --prefix apps/admin run audit:custom-domain-cutover\` and wait for READY before applying the custom-domain site URL. ${errorOutput}`
    );
  }

  return commandResult.stdout.trim();
};

const run = async (): Promise<void> => {
  const applyMode = readApplyMode();
  const target = readTarget();
  const projectRef = readProjectRef("SUPABASE_AUTH_CONFIG_APPLY_PROJECT_REF");
  const currentAuthConfig = await fetchAuthConfig(projectRef);
  const currentState = resolveSiteUrlState(currentAuthConfig.site_url);
  const targetState = targetToState(target);

  assertRequiredRedirectUrls(currentAuthConfig);
  assertGoogleOAuthState(currentAuthConfig);

  if (currentState === targetState) {
    throw new Error(`Supabase auth config is already in ${targetState}. No apply needed.`);
  }

  let domainGateOutput = "not-required";

  if (target === "custom-domain") {
    domainGateOutput = runCustomDomainGate();
  }

  const patch = buildManagedAuthConfigPatch(target, currentAuthConfig);

  if (applyMode === "dry-run") {
    console.log(
      [
        "supabase-auth-url-config-apply:DRY_RUN",
        `project:${projectRef}`,
        `from:${currentState}`,
        `to:${targetState}`,
        `site-url:${patch.site_url}`,
        `redirect-count:${patch.uri_allow_list.split(",").length}`,
        `domain-gate:${domainGateOutput === "not-required" ? "not-required" : "passed"}`,
        "next:rerun-with-apply-mode-to-write",
      ].join("|")
    );

    return;
  }

  await patchAuthConfig(projectRef, patch);

  const updatedAuthConfig = await assertTargetStateReachedAsync(projectRef, targetState);
  const updatedState = resolveSiteUrlState(updatedAuthConfig.site_url);
  const redirectUrls = assertRequiredRedirectUrls(updatedAuthConfig);

  assertGoogleOAuthState(updatedAuthConfig);

  console.log(
    [
      "supabase-auth-url-config-apply:APPLIED",
      `project:${projectRef}`,
      `from:${currentState}`,
      `to:${updatedState}`,
      `site-url:${updatedAuthConfig.site_url}`,
      `redirect-count:${redirectUrls.length}`,
      `domain-gate:${domainGateOutput === "not-required" ? "not-required" : "passed"}`,
      "google:enabled",
    ].join("|")
  );
};

void run();
