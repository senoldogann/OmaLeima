import { chromium, type Browser, type Page } from "@playwright/test";

export type BrowserSignInCredentials = {
  email: string;
  password: string;
};

export type BrowserSmokeRouteExpectation = {
  navigationLabel: string;
  routePath: string;
  title: string;
};

export const assertLoginPageReachableAsync = async (appBaseUrl: string): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${appBaseUrl}/login`, {
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

export const signInWithPasswordAsync = async (
  page: Page,
  appBaseUrl: string,
  credentials: BrowserSignInCredentials,
  expectedPath: string,
  expectedTitle: string,
  timeoutMs: number,
): Promise<void> => {
  await page.goto(`${appBaseUrl}/login`, {
    waitUntil: "networkidle",
  });

  await page.getByRole("heading", {
    level: 1,
    name: "Admin and club operations",
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
  await page.goto(`${appBaseUrl}${protectedPath}`, {
    waitUntil: "networkidle",
  });

  await page.waitForURL("**/login", {
    timeout: timeoutMs,
  });

  await page.getByRole("heading", {
    level: 1,
    name: "Admin and club operations",
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
  await Promise.all([
    page.waitForURL(`**${routeExpectation.routePath}`, {
      timeout: timeoutMs,
    }),
    page.getByRole("link", {
      name: routeExpectation.navigationLabel,
    }).click(),
  ]);

  await page.getByRole("heading", {
    level: 2,
    name: routeExpectation.title,
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};

export const signOutAsync = async (page: Page, timeoutMs: number): Promise<void> => {
  await Promise.all([
    page.waitForURL("**/login", {
      timeout: timeoutMs,
    }),
    page.getByRole("button", {
      name: "Sign out",
    }).click(),
  ]);

  await page.getByRole("heading", {
    level: 1,
    name: "Admin and club operations",
  }).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
};
