import { chromium, type Browser, type Page } from "@playwright/test";

import { dashboardLocaleCookieName } from "../../src/features/dashboard/locale-cookie";

export type BrowserSignInCredentials = {
  email: string;
  password: string;
};

export type BrowserSmokeRouteExpectation = {
  navigationLabel: string;
  routePath: string;
  title: string;
};

const createBypassHeaders = (bypassSecret: string | null): HeadersInit | undefined => {
  if (bypassSecret === null) {
    return undefined;
  }

  return {
    "x-vercel-protection-bypass": bypassSecret,
  };
};

export const assertLoginPageReachableAsync = async (
  appBaseUrl: string,
  bypassSecret: string | null,
): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${appBaseUrl}/login`, {
      headers: createBypassHeaders(bypassSecret),
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown fetch error";

    throw new Error(`Could not reach ${appBaseUrl}/login before browser smoke: ${errorMessage}.`);
  }

  if (response.status !== 200) {
    throw new Error(`Expected ${appBaseUrl}/login to return 200 before browser smoke, got ${response.status}.`);
  }
};

export const launchBrowserAsync = async (installCommand: string): Promise<Browser> => {
  try {
    return await chromium.launch({
      headless: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown browser launch error";

    throw new Error(`Failed to launch Playwright Chromium for browser smoke: ${errorMessage}. Run "${installCommand}" first.`);
  }
};

export const createBrowserHeaders = (bypassSecret: string | null): Record<string, string> =>
  bypassSecret === null
    ? {}
    : {
        "x-vercel-protection-bypass": bypassSecret,
      };

const setDashboardLocaleCookieAsync = async (page: Page, appBaseUrl: string): Promise<void> => {
  await page.context().addCookies([
    {
      name: dashboardLocaleCookieName,
      sameSite: "Lax",
      url: appBaseUrl,
      value: "en",
    },
  ]);
};

export const signInWithPasswordAsync = async (
  page: Page,
  appBaseUrl: string,
  credentials: BrowserSignInCredentials,
  expectedPath: string,
  expectedTitle: string,
  timeoutMs: number,
): Promise<void> => {
  await setDashboardLocaleCookieAsync(page, appBaseUrl);

  await page.goto(`${appBaseUrl}/login`, {
    waitUntil: "domcontentloaded",
  });

  await page.getByRole("heading", {
    level: 2,
    name: "Open dashboard",
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });

  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);

  await Promise.all([
    page.waitForURL(`**${expectedPath}`, {
      timeout: timeoutMs,
    }),
    page.getByRole("button", {
      name: "Sign in with password",
    }).click(),
  ]);

  await page.getByRole("heading", {
    level: 2,
    name: expectedTitle,
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};

export const assertAnonymousRedirectAsync = async (
  page: Page,
  appBaseUrl: string,
  protectedPath: string,
  timeoutMs: number,
): Promise<void> => {
  await setDashboardLocaleCookieAsync(page, appBaseUrl);

  await page.goto(`${appBaseUrl}${protectedPath}`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForURL("**/login", {
    timeout: timeoutMs,
  });

  await page.getByRole("heading", {
    level: 2,
    name: "Open dashboard",
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};

export const openRouteFromSidebarAsync = async (
  page: Page,
  routeExpectation: BrowserSmokeRouteExpectation,
  timeoutMs: number,
): Promise<void> => {
  const routeLink = page.getByRole("navigation").getByRole("link", {
    name: routeExpectation.navigationLabel,
  });
  const routeHref = await routeLink.getAttribute("href", {
    timeout: timeoutMs,
  });

  if (routeHref === null) {
    throw new Error(`Navigation link ${routeExpectation.navigationLabel} is missing an href.`);
  }

  await routeLink.click();

  try {
    await page.waitForFunction(
      (routePath: string) => window.location.pathname === routePath,
      routeExpectation.routePath,
      {
        timeout: 2_000,
      }
    );
  } catch {
    await page.goto(new URL(routeHref, page.url()).toString(), {
      waitUntil: "domcontentloaded",
    });
  }

  await page.getByRole("heading", {
    level: 2,
    name: routeExpectation.title,
  }).first().waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};

export const signOutAsync = async (page: Page, timeoutMs: number): Promise<void> => {
  await page.getByRole("button", {
    name: "Sign out",
  }).click();

  await Promise.all([
    page.waitForURL("**/login", {
      timeout: timeoutMs,
    }),
    page.getByRole("button", {
      name: "Kyllä, kirjaudu ulos",
    }).click(),
  ]);

  await page.getByRole("heading", {
    level: 2,
    name: "Open dashboard",
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};
