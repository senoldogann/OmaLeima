import type { Page } from "@playwright/test";

import {
  assertAnonymousRedirectAsync,
  assertLoginPageReachableAsync,
  createBrowserHeaders,
  launchBrowserAsync,
  openRouteFromSidebarAsync,
  signInWithPasswordAsync,
  signOutAsync,
  type BrowserSignInCredentials,
  type BrowserSmokeRouteExpectation,
} from "./_shared/browser-smoke";

const appBaseUrl = process.env.ADMIN_APP_BASE_URL;
const stagingAdminEmail = process.env.STAGING_ADMIN_EMAIL;
const stagingAdminPassword = process.env.STAGING_ADMIN_PASSWORD;
const vercelAutomationBypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const browserTimeoutMs = 15_000;
const playwrightInstallCommand = "npm --prefix apps/admin exec playwright install chromium";

const requireEnvString = (value: string | undefined, variableName: string): string => {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${variableName} for hosted admin smoke.`);
  }

  return value;
};

const credentials: BrowserSignInCredentials = {
  email: requireEnvString(stagingAdminEmail, "STAGING_ADMIN_EMAIL"),
  password: requireEnvString(stagingAdminPassword, "STAGING_ADMIN_PASSWORD"),
};

const hostedRouteExpectations: BrowserSmokeRouteExpectation[] = [
  {
    navigationLabel: "Platform oversight",
    routePath: "/admin/oversight",
    title: "Platform oversight",
  },
  {
    navigationLabel: "Business applications",
    routePath: "/admin/business-applications",
    title: "Business applications",
  },
  {
    navigationLabel: "Department tags",
    routePath: "/admin/department-tags",
    title: "Department tags",
  },
];

const assertAdminLandingAsync = async (page: Page): Promise<void> => {
  await page.getByRole("heading", {
    level: 1,
    name: "Platform admin",
  }).waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });

  await page.getByRole("heading", {
    level: 2,
    name: "Operations dashboard",
  }).waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const resolvedAppBaseUrl = requireEnvString(appBaseUrl, "ADMIN_APP_BASE_URL");
  const browser = await launchBrowserAsync(playwrightInstallCommand);
  const bypassSecret = typeof vercelAutomationBypassSecret === "string" && vercelAutomationBypassSecret.length > 0
    ? vercelAutomationBypassSecret
    : null;

  try {
    await assertLoginPageReachableAsync(resolvedAppBaseUrl, bypassSecret);
    outputs.push("preflight-login:SUCCESS");

    const context = await browser.newContext({
      extraHTTPHeaders: createBrowserHeaders(bypassSecret),
    });
    const page = await context.newPage();

    await assertAnonymousRedirectAsync(page, resolvedAppBaseUrl, "/admin", browserTimeoutMs);
    outputs.push("anonymous-admin-redirect:SUCCESS");

    await signInWithPasswordAsync(
      page,
      resolvedAppBaseUrl,
      credentials,
      "/admin",
      "Operations dashboard",
      browserTimeoutMs
    );
    await assertAdminLandingAsync(page);
    outputs.push("hosted-login:SUCCESS");

    for (const routeExpectation of hostedRouteExpectations) {
      await openRouteFromSidebarAsync(page, routeExpectation, browserTimeoutMs);
      outputs.push(`${routeExpectation.routePath}:SUCCESS`);
    }

    await signOutAsync(page, browserTimeoutMs);
    outputs.push("sign-out:SUCCESS");

    console.log(outputs.join("|"));
    await context.close();
  } finally {
    await browser.close();
  }
};

void run();
