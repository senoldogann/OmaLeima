import { randomUUID } from "node:crypto";

import { chromium, type Browser, type Locator, type Page } from "@playwright/test";

import {
  readSqlTextAsync,
  runSqlAsync,
  seededAdminEmail,
  seededPassword,
} from "./_shared/function-smoke";

type ReviewFixture = {
  approveApplicationId: string;
  approveBusinessName: string;
  rejectApplicationId: string;
  rejectBusinessName: string;
  suffix: string;
};

type BusinessApplicationStatus = "APPROVED" | "PENDING" | "REJECTED";

const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const functionBaseUrl = process.env.SUPABASE_FUNCTIONS_BASE_URL ?? "http://127.0.0.1:54321/functions/v1";
const rejectReason = "Browser smoke rejection reason.";
const browserTimeoutMs = 15_000;
const databasePollTimeoutMs = 10_000;

const sleepAsync = async (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

const assertAdminAppReachableAsync = async (): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${appBaseUrl}/login`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown fetch error";

    throw new Error(
      `Could not reach ${appBaseUrl}/login before browser smoke: ${errorMessage}. Start the admin app with "npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001" or override ADMIN_APP_BASE_URL.`
    );
  }

  if (response.status !== 200) {
    throw new Error(`Expected ${appBaseUrl}/login to return 200 before browser smoke, got ${response.status}.`);
  }
};

const assertFunctionServerReachableAsync = async (): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${functionBaseUrl}/generate-qr-token`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown fetch error";

    throw new Error(
      `Could not reach ${functionBaseUrl}/generate-qr-token before browser smoke: ${errorMessage}. Start the local function server with "supabase functions serve --env-file supabase/.env.local" or override SUPABASE_FUNCTIONS_BASE_URL.`
    );
  }

  if (response.status !== 405) {
    throw new Error(
      `Expected ${functionBaseUrl}/generate-qr-token to return 405 on GET before browser smoke, got ${response.status}.`
    );
  }
};

const seedReviewFixtureAsync = async (suffix: string): Promise<ReviewFixture> => {
  const approveApplicationId = randomUUID();
  const rejectApplicationId = randomUUID();
  const approveBusinessName = `Browser Smoke Approve ${suffix}`;
  const rejectBusinessName = `Browser Smoke Reject ${suffix}`;

  await runSqlAsync(`
    insert into public.business_applications (
      id,
      business_name,
      contact_name,
      contact_email,
      address,
      city,
      country,
      website_url,
      message,
      created_at
    ) values
      (
        '${approveApplicationId}',
        '${approveBusinessName}',
        'Browser Smoke Operator',
        'browser-smoke-approve-${suffix.toLowerCase()}@example.test',
        'Browser Review Street 1',
        'Helsinki',
        'Finland',
        'https://example.test/browser-review',
        'Browser smoke approve candidate.',
        now()
      ),
      (
        '${rejectApplicationId}',
        '${rejectBusinessName}',
        'Browser Smoke Operator',
        'browser-smoke-reject-${suffix.toLowerCase()}@example.test',
        'Browser Review Street 2',
        'Helsinki',
        'Finland',
        'https://example.test/browser-review',
        'Browser smoke reject candidate.',
        now() + interval '1 second'
      );
  `);

  return {
    approveApplicationId,
    approveBusinessName,
    rejectApplicationId,
    rejectBusinessName,
    suffix,
  };
};

const cleanupReviewFixtureAsync = async (fixture: ReviewFixture): Promise<void> => {
  await runSqlAsync(`
    delete from public.audit_logs
    where resource_id in ('${fixture.approveApplicationId}'::uuid, '${fixture.rejectApplicationId}'::uuid);

    delete from public.businesses
    where application_id in ('${fixture.approveApplicationId}'::uuid, '${fixture.rejectApplicationId}'::uuid);

    delete from public.business_applications
    where id in ('${fixture.approveApplicationId}'::uuid, '${fixture.rejectApplicationId}'::uuid);
  `);
};

const waitForApplicationStateAsync = async (
  applicationId: string,
  expectedStatus: BusinessApplicationStatus,
  expectedReason: string | null,
): Promise<void> => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < databasePollTimeoutMs) {
    const result = await readSqlTextAsync(`
      select status || '|' || coalesce(rejection_reason, '')
      from public.business_applications
      where id = '${applicationId}'::uuid;
    `);

    if (result.length > 0) {
      const separatorIndex = result.indexOf("|");
      const status = separatorIndex === -1 ? result : result.slice(0, separatorIndex);
      const reason = separatorIndex === -1 ? "" : result.slice(separatorIndex + 1);

      if (status === expectedStatus && reason === (expectedReason ?? "")) {
        return;
      }
    }

    await sleepAsync(250);
  }

  throw new Error(
    `Timed out waiting for application ${applicationId} to reach ${expectedStatus} with reason ${expectedReason ?? ""}.`
  );
};

const createCardLocator = (page: Page, businessName: string): Locator =>
  page.locator("article.panel.review-card").filter({
    has: page.getByRole("heading", {
      level: 3,
      name: businessName,
    }),
  });

const signInAsAdminAsync = async (page: Page): Promise<void> => {
  await page.goto(`${appBaseUrl}/login`, {
    waitUntil: "networkidle",
  });
  await page.getByLabel("Email").fill(seededAdminEmail);
  await page.getByLabel("Password").fill(seededPassword);

  await Promise.all([
    page.waitForURL("**/admin", {
      timeout: browserTimeoutMs,
    }),
    page.getByRole("button", {
      name: "Sign in with password",
    }).click(),
  ]);

  await page.waitForLoadState("networkidle");
};

const openBusinessApplicationsAsync = async (page: Page): Promise<void> => {
  await page.getByRole("link", {
    name: "Business applications",
  }).click();
  await page.waitForURL("**/admin/business-applications", {
    timeout: browserTimeoutMs,
  });
  await page.waitForLoadState("networkidle");
};

const approveApplicationAsync = async (page: Page, businessName: string): Promise<void> => {
  const card = createCardLocator(page, businessName);

  await card.waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });
  await card.getByRole("button", {
    name: "Approve application",
  }).click();
};

const rejectApplicationAsync = async (page: Page, businessName: string, reason: string): Promise<void> => {
  const card = createCardLocator(page, businessName);

  await card.waitFor({
    state: "visible",
    timeout: browserTimeoutMs,
  });
  await card.getByRole("button", {
    name: "Reject with reason",
  }).click();
  await card.getByLabel("Reason").fill(reason);
  await card.getByRole("button", {
    name: "Confirm rejection",
  }).click();
};

const launchBrowserAsync = async (): Promise<Browser> => {
  try {
    return await chromium.launch({
      headless: true,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown browser launch error";

    throw new Error(
      `Failed to launch Playwright Chromium for browser smoke: ${errorMessage}. Run "npm --prefix apps/admin exec playwright install chromium" first.`
    );
  }
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];
  const fixture = await seedReviewFixtureAsync(randomUUID().slice(0, 8).toUpperCase());
  let browser: Browser | null = null;
  let runError: Error | null = null;

  try {
    await assertAdminAppReachableAsync();
    await assertFunctionServerReachableAsync();
    browser = await launchBrowserAsync();

    const page = await browser.newPage();
    await signInAsAdminAsync(page);
    outputs.push("browser-login:SUCCESS");

    await openBusinessApplicationsAsync(page);
    outputs.push("browser-nav:SUCCESS");

    await approveApplicationAsync(page, fixture.approveBusinessName);
    await waitForApplicationStateAsync(fixture.approveApplicationId, "APPROVED", null);
    outputs.push("browser-approve:SUCCESS");

    await page.reload({
      waitUntil: "networkidle",
    });

    await rejectApplicationAsync(page, fixture.rejectBusinessName, rejectReason);
    await waitForApplicationStateAsync(fixture.rejectApplicationId, "REJECTED", rejectReason);
    outputs.push("browser-reject:SUCCESS");

    console.log(outputs.join("|"));
  } catch (error) {
    runError = error instanceof Error ? error : new Error("Unknown browser review smoke error.");
    throw runError;
  } finally {
    if (browser !== null) {
      await browser.close();
    }

    try {
      await cleanupReviewFixtureAsync(fixture);
    } catch (cleanupError) {
      if (runError === null) {
        throw cleanupError;
      }

      console.error(cleanupError);
    }
  }
};

void run();
