import type { Page, Response } from "@playwright/test";

import {
  seededAdminEmail,
  seededOrganizerEmail,
  seededPassword,
} from "./_shared/function-smoke";
import {
  assertLoginPageReachableAsync,
  launchBrowserAsync,
  openRouteFromSidebarAsync,
  signInWithPasswordAsync,
  signOutAsync,
  type BrowserSmokeRouteExpectation,
} from "./_shared/browser-smoke";

type BrowserIssue = {
  message: string;
  source: "console" | "pageerror" | "response";
  url: string | null;
};

type DashboardBrowserCase = {
  credentials: {
    email: string;
    password: string;
  };
  expectedPath: string;
  expectedTitle: string;
  localeToggle: {
    englishTitle: string;
    finnishTitle: string;
    route: BrowserSmokeRouteExpectation;
  };
  outputPrefix: string;
  routes: BrowserSmokeRouteExpectation[];
};

const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const browserTimeoutMs = 30_000;
const playwrightInstallCommand = "npm --prefix apps/admin exec playwright install chromium";

const adminRoutes: BrowserSmokeRouteExpectation[] = [
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
    navigationLabel: "Users",
    routePath: "/admin/users",
    title: "Users",
  },
  {
    navigationLabel: "Department tags",
    routePath: "/admin/department-tags",
    title: "Department tags",
  },
  {
    navigationLabel: "Announcements",
    routePath: "/admin/announcements",
    title: "Announcements",
  },
  {
    navigationLabel: "Login slides",
    routePath: "/admin/login-slides",
    title: "Login slides",
  },
  {
    navigationLabel: "Reward tiers",
    routePath: "/admin/rewards",
    title: "Reward tiers",
  },
  {
    navigationLabel: "Contact submissions",
    routePath: "/admin/contact-submissions",
    title: "Contact submissions",
  },
  {
    navigationLabel: "Mobile support",
    routePath: "/admin/support-requests",
    title: "Mobile support",
  },
];

const organizerRoutes: BrowserSmokeRouteExpectation[] = [
  {
    navigationLabel: "Club events",
    routePath: "/club/events",
    title: "Club events",
  },
  {
    navigationLabel: "Reports",
    routePath: "/club/reports",
    title: "Reports",
  },
  {
    navigationLabel: "Profile",
    routePath: "/club/profile",
    title: "Organizer profile",
  },
  {
    navigationLabel: "Department tags",
    routePath: "/club/department-tags",
    title: "Department tags",
  },
  {
    navigationLabel: "Reward claims",
    routePath: "/club/claims",
    title: "Reward claims",
  },
  {
    navigationLabel: "Fraud review",
    routePath: "/club/fraud",
    title: "Fraud review",
  },
  {
    navigationLabel: "Announcements",
    routePath: "/club/announcements",
    title: "Announcements",
  },
  {
    navigationLabel: "Reward tiers",
    routePath: "/club/rewards",
    title: "Reward tiers",
  },
];

const dashboardCases: DashboardBrowserCase[] = [
  {
    credentials: {
      email: seededAdminEmail,
      password: seededPassword,
    },
    expectedPath: "/admin",
    expectedTitle: "Operations dashboard",
    localeToggle: {
      englishTitle: "Users",
      finnishTitle: "Käyttäjät",
      route: {
        navigationLabel: "Users",
        routePath: "/admin/users",
        title: "Users",
      },
    },
    outputPrefix: "admin",
    routes: adminRoutes,
  },
  {
    credentials: {
      email: seededOrganizerEmail,
      password: seededPassword,
    },
    expectedPath: "/club",
    expectedTitle: "Organizer dashboard",
    localeToggle: {
      englishTitle: "Reward claims",
      finnishTitle: "Palkintojen luovutus",
      route: {
        navigationLabel: "Reward claims",
        routePath: "/club/claims",
        title: "Reward claims",
      },
    },
    outputPrefix: "organizer",
    routes: organizerRoutes,
  },
];

const attachBrowserIssueCollector = (page: Page, issues: BrowserIssue[]): void => {
  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    issues.push({
      message: message.text(),
      source: "console",
      url: message.location().url.length > 0 ? message.location().url : null,
    });
  });

  page.on("pageerror", (error) => {
    issues.push({
      message: error.message,
      source: "pageerror",
      url: page.url(),
    });
  });

  page.on("response", (response: Response) => {
    if (response.status() < 500) {
      return;
    }

    issues.push({
      message: `HTTP ${response.status()} ${response.statusText()}`,
      source: "response",
      url: response.url(),
    });
  });
};

const frameworkErrorTexts = [
  "This page couldn't load",
  "Unhandled Runtime Error",
  "Build Error",
  "Runtime Error",
] as const;

const isTextVisibleAsync = async (page: Page, text: string): Promise<boolean> =>
  page.getByText(text, {
    exact: false,
  }).first().isVisible({
    timeout: 500,
  });

const assertNoFrameworkOverlayAsync = async (page: Page): Promise<void> => {
  const overlayChecks = await Promise.all(
    frameworkErrorTexts.map((text) => isTextVisibleAsync(page, text))
  );
  const hasErrorOverlay = overlayChecks.some((isVisible) => isVisible);

  if (hasErrorOverlay) {
    throw new Error(`Framework error overlay is visible on ${page.url()}.`);
  }
};

const assertNoBrowserIssues = (issues: BrowserIssue[], outputPrefix: string): void => {
  if (issues.length === 0) {
    return;
  }

  const issueSummary = issues
    .map((issue) => `${issue.source}:${issue.url ?? "unknown-url"}:${issue.message}`)
    .join(" | ");

  throw new Error(`${outputPrefix} browser issues detected: ${issueSummary}`);
};

const openRouteAndAssertAsync = async (
  page: Page,
  route: BrowserSmokeRouteExpectation,
): Promise<void> => {
  await openRouteFromSidebarAsync(page, route, browserTimeoutMs);
  await assertNoFrameworkOverlayAsync(page);
};

const exerciseLocaleSwitchAsync = async (
  page: Page,
  localeToggle: DashboardBrowserCase["localeToggle"],
): Promise<void> => {
  await openRouteAndAssertAsync(page, localeToggle.route);

  await page.locator(".dashboard-locale-switch").click();
  await page.waitForLoadState("networkidle", {
    timeout: browserTimeoutMs,
  }).catch(() => undefined);
  await page.getByRole("heading", {
    level: 2,
    name: localeToggle.finnishTitle,
  }).waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });
  await assertNoFrameworkOverlayAsync(page);

  await page.locator(".dashboard-locale-switch").click();
  await page.waitForLoadState("networkidle", {
    timeout: browserTimeoutMs,
  }).catch(() => undefined);
  await page.getByRole("heading", {
    level: 2,
    name: localeToggle.englishTitle,
  }).waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });
  await assertNoFrameworkOverlayAsync(page);
};

const runDashboardCaseAsync = async (
  browser: Awaited<ReturnType<typeof launchBrowserAsync>>,
  dashboardCase: DashboardBrowserCase,
): Promise<string[]> => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const issues: BrowserIssue[] = [];
  const outputs: string[] = [];

  attachBrowserIssueCollector(page, issues);

  try {
    await signInWithPasswordAsync(
      page,
      appBaseUrl,
      dashboardCase.credentials,
      dashboardCase.expectedPath,
      dashboardCase.expectedTitle,
      browserTimeoutMs
    );
    await assertNoFrameworkOverlayAsync(page);
    outputs.push(`${dashboardCase.outputPrefix}-login:SUCCESS`);

    for (const route of dashboardCase.routes) {
      await openRouteAndAssertAsync(page, route);
      outputs.push(`${dashboardCase.outputPrefix}-${route.routePath}:SUCCESS`);
    }

    await exerciseLocaleSwitchAsync(page, dashboardCase.localeToggle);
    outputs.push(`${dashboardCase.outputPrefix}-locale-switch:SUCCESS`);

    assertNoBrowserIssues(issues, dashboardCase.outputPrefix);

    await signOutAsync(page, browserTimeoutMs);
    outputs.push(`${dashboardCase.outputPrefix}-sign-out:SUCCESS`);

    return outputs;
  } finally {
    await context.close();
  }
};

const run = async (): Promise<void> => {
  await assertLoginPageReachableAsync(appBaseUrl, null);

  const browser = await launchBrowserAsync(playwrightInstallCommand);

  try {
    const outputs: string[] = [];

    for (const dashboardCase of dashboardCases) {
      const caseOutputs = await runDashboardCaseAsync(browser, dashboardCase);
      outputs.push(...caseOutputs);
    }

    console.log(outputs.join("|"));
  } finally {
    await browser.close();
  }
};

void run();
