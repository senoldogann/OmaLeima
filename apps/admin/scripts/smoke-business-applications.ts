import { randomUUID } from "node:crypto";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for business application smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for business application smoke script.");
}

type BusinessApplicationStatus = "APPROVED" | "PENDING" | "REJECTED";

type BusinessApplicationRow = {
  business_name: string;
  id: string;
  rejection_reason: string | null;
  status: BusinessApplicationStatus;
};

type AuthedClient = {
  email: string;
  supabase: ReturnType<typeof createStatelessClient>;
};

type CookieBackedClient = {
  email: string;
  supabase: ReturnType<typeof createBrowserClient>;
  toCookieHeader: () => string;
};

type ReviewMutationResponse = {
  message?: string;
  status?: string;
};

const createStatelessClient = () =>
  createClient(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

const createAuthedClientAsync = async (email: string, password: string): Promise<AuthedClient> => {
  const supabase = createStatelessClient();
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in ${email} for business application smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
  };
};

const createCookieBackedClientAsync = async (email: string, password: string): Promise<CookieBackedClient> => {
  const cookieJar = new Map<string, string>();
  const supabase = createBrowserClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.entries()).map(([name, value]) => ({
          name,
          value,
        }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          cookieJar.set(name, value);
        });
      },
    },
  });
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in ${email} for route-backed business application smoke: ${signInResult.error.message}`);
  }

  return {
    email,
    supabase,
    toCookieHeader: () =>
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
  };
};

const insertPendingApplicationAsync = async (
  client: AuthedClient,
  suffix: string,
  createdAt: string,
  websiteUrl: string
): Promise<BusinessApplicationRow> => {
  const { data, error } = await client.supabase
    .from("business_applications")
    .insert({
      address: `${suffix} Street 1`,
      business_name: `Smoke Venue ${suffix}`,
      city: "Helsinki",
      contact_email: `smoke-${suffix.toLowerCase()}@example.test`,
      contact_name: "Smoke Operator",
      country: "Finland",
      created_at: createdAt,
      message: `Smoke queue check ${suffix}`,
      status: "PENDING",
      website_url: websiteUrl,
    })
    .select("id,business_name,status,rejection_reason")
    .single<BusinessApplicationRow>();

  if (error !== null) {
    throw new Error(`Failed to insert smoke business application ${suffix}: ${error.message}`);
  }

  return data;
};

const insertPendingApplicationBatchAsync = async (
  client: AuthedClient,
  suffix: string,
  count: number,
  createdAtStart: number
): Promise<BusinessApplicationRow[]> => {
  const rows = Array.from({ length: count }, (_, index) => ({
    address: `${suffix}-BATCH-${index + 1} Street 1`,
    business_name: `Smoke Venue ${suffix}-BATCH-${index + 1}`,
    city: "Helsinki",
    contact_email: `smoke-${suffix.toLowerCase()}-batch-${index + 1}@example.test`,
    contact_name: "Smoke Operator",
    country: "Finland",
    created_at: new Date(createdAtStart + index * 1000).toISOString(),
    message: `Smoke queue batch ${suffix}-${index + 1}`,
    status: "PENDING",
    website_url: "https://example.test/review",
  }));
  const { data, error } = await client.supabase
    .from("business_applications")
    .insert(rows)
    .select("id,business_name,status,rejection_reason")
    .returns<BusinessApplicationRow[]>();

  if (error !== null) {
    throw new Error(`Failed to insert smoke business application batch ${suffix}: ${error.message}`);
  }

  return data;
};

const assertAdminVisibleRowsAsync = async (client: AuthedClient, ids: string[]): Promise<void> => {
  const { data, error } = await client.supabase
    .from("business_applications")
    .select("id,business_name,status,rejection_reason")
    .in("id", ids)
    .returns<BusinessApplicationRow[]>();

  if (error !== null) {
    throw new Error(`Admin queue read failed for ${client.email}: ${error.message}`);
  }

  if (data.length !== ids.length) {
    throw new Error(`Expected admin queue read to return ${ids.length} rows, got ${data.length}.`);
  }
};

const assertRowsHiddenAsync = async (client: AuthedClient, ids: string[]): Promise<void> => {
  const { data, error } = await client.supabase
    .from("business_applications")
    .select("id")
    .in("id", ids);

  if (error !== null) {
    throw new Error(`Non-admin queue read returned an unexpected error for ${client.email}: ${error.message}`);
  }

  if (data.length !== 0) {
    throw new Error(`Expected ${client.email} to see 0 business application rows, got ${data.length}.`);
  }
};

const fetchPendingApplicationCountAsync = async (client: AuthedClient): Promise<number> => {
  const { count, error } = await client.supabase
    .from("business_applications")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("status", "PENDING");

  if (error !== null) {
    throw new Error(`Failed to count pending business applications for ${client.email}: ${error.message}`);
  }

  return count ?? 0;
};

const assertPageContainsQueueAsync = async (
  client: CookieBackedClient,
  pageNumber: number,
  expectedSnippet: string,
  forbiddenSnippet: string | null
): Promise<void> => {
  const path = pageNumber === 1 ? "/admin/business-applications" : `/admin/business-applications?page=${pageNumber}`;
  const response = await fetch(`${appBaseUrl}${path}`, {
    headers: {
      Cookie: client.toCookieHeader(),
    },
    method: "GET",
  });
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`Expected admin business applications page to return 200, got ${response.status}.`);
  }

  if (!html.includes(expectedSnippet)) {
    throw new Error(`Expected admin business applications page to contain ${expectedSnippet}.`);
  }

  if (forbiddenSnippet !== null && html.includes(forbiddenSnippet)) {
    throw new Error(`Expected admin business applications page not to contain ${forbiddenSnippet}.`);
  }
};

const invokeReviewRouteAsync = async (
  client: CookieBackedClient,
  path: "/api/admin/business-applications/approve" | "/api/admin/business-applications/reject",
  body: Record<string, string>
): Promise<{ responseBody: ReviewMutationResponse; status: number }> => {
  const response = await fetch(`${appBaseUrl}${path}`, {
    body: JSON.stringify(body),
    headers: {
      Cookie: client.toCookieHeader(),
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const responseBody = (await response.json()) as ReviewMutationResponse;

  return {
    responseBody,
    status: response.status,
  };
};

const assertApplicationStateAsync = async (
  client: AuthedClient,
  applicationId: string,
  expectedStatus: BusinessApplicationStatus,
  expectedReason: string | null
): Promise<void> => {
  const { data, error } = await client.supabase
    .from("business_applications")
    .select("id,status,rejection_reason")
    .eq("id", applicationId)
    .single<Pick<BusinessApplicationRow, "id" | "rejection_reason" | "status">>();

  if (error !== null) {
    throw new Error(`Failed to verify business application ${applicationId}: ${error.message}`);
  }

  if (data.status !== expectedStatus) {
    throw new Error(
      `Expected business application ${applicationId} to be ${expectedStatus}, got ${data.status}.`
    );
  }

  if (data.rejection_reason !== expectedReason) {
    throw new Error(
      `Expected business application ${applicationId} rejection reason ${expectedReason}, got ${data.rejection_reason}.`
    );
  }
};

const signOutAsync = async (client: AuthedClient | CookieBackedClient): Promise<void> => {
  const signOutResult = await client.supabase.auth.signOut();

  if (signOutResult.error !== null) {
    throw new Error(`Failed to sign out ${client.email}: ${signOutResult.error.message}`);
  }
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const createdAtBase = Date.now();
  const adminDataClient = await createAuthedClientAsync("admin@omaleima.test", "password123");
  const organizerDataClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
  const studentDataClient = await createAuthedClientAsync("student@omaleima.test", "password123");
  const adminRouteClient = await createCookieBackedClientAsync("admin@omaleima.test", "password123");
  const organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
  const existingPendingCount = await fetchPendingApplicationCountAsync(adminDataClient);
  const approvedCandidate = await insertPendingApplicationAsync(
    adminDataClient,
    `${suffix}-APPROVE`,
    new Date(createdAtBase).toISOString(),
    "https://example.test/review"
  );
  const rejectedCandidate = await insertPendingApplicationAsync(
    adminDataClient,
    `${suffix}-REJECT`,
    new Date(createdAtBase + 1000).toISOString(),
    "https://example.test/review"
  );
  const unsafeWebsiteValue = "javascript:alert('xss')";
  const forbiddenCandidate = await insertPendingApplicationAsync(
    adminDataClient,
    `${suffix}-DENY`,
    new Date(createdAtBase + 2000).toISOString(),
    unsafeWebsiteValue
  );
  const paginatedCandidates = await insertPendingApplicationBatchAsync(
    adminDataClient,
    suffix,
    18,
    createdAtBase + 3000
  );
  const applicationIds = [
    approvedCandidate.id,
    rejectedCandidate.id,
    forbiddenCandidate.id,
    ...paginatedCandidates.map((candidate) => candidate.id),
  ];
  const pageSize = 20;
  const approvedCandidatePage = Math.ceil((existingPendingCount + 1) / pageSize);
  const forbiddenCandidatePage = Math.ceil((existingPendingCount + 3) / pageSize);
  const lastPaginatedCandidate = paginatedCandidates[paginatedCandidates.length - 1];
  const lastPaginatedCandidatePage = Math.ceil((existingPendingCount + applicationIds.length) / pageSize);
  const outputs: string[] = [];

  await assertAdminVisibleRowsAsync(adminDataClient, applicationIds);
  outputs.push(`admin-read:${applicationIds.length}`);

  await assertRowsHiddenAsync(organizerDataClient, applicationIds);
  outputs.push("organizer-read:0");

  await assertRowsHiddenAsync(studentDataClient, applicationIds);
  outputs.push("student-read:0");

  await assertPageContainsQueueAsync(adminRouteClient, approvedCandidatePage, approvedCandidate.business_name, null);
  outputs.push("admin-route-content:ok");

  await assertPageContainsQueueAsync(adminRouteClient, forbiddenCandidatePage, forbiddenCandidate.business_name, unsafeWebsiteValue);
  outputs.push("admin-route-unsafe-url-hidden:ok");

  await assertPageContainsQueueAsync(
    adminRouteClient,
    lastPaginatedCandidatePage,
    lastPaginatedCandidate.business_name,
    null
  );
  outputs.push(`admin-route-page-${lastPaginatedCandidatePage}:ok`);

  const approveResult = await invokeReviewRouteAsync(adminRouteClient, "/api/admin/business-applications/approve", {
    applicationId: approvedCandidate.id,
  });

  if (approveResult.status !== 200 || approveResult.responseBody.status !== "SUCCESS") {
    throw new Error(
      `Expected approve route to return 200 SUCCESS, got ${approveResult.status} ${approveResult.responseBody.status}.`
    );
  }

  outputs.push(`approve:${approveResult.responseBody.status}`);

  const rejectReason = "Missing event-safe contact details.";
  const rejectResult = await invokeReviewRouteAsync(adminRouteClient, "/api/admin/business-applications/reject", {
    applicationId: rejectedCandidate.id,
    rejectionReason: rejectReason,
  });

  if (rejectResult.status !== 200 || rejectResult.responseBody.status !== "SUCCESS") {
    throw new Error(
      `Expected reject route to return 200 SUCCESS, got ${rejectResult.status} ${rejectResult.responseBody.status}.`
    );
  }

  outputs.push(`reject:${rejectResult.responseBody.status}`);

  const duplicateApproveResult = await invokeReviewRouteAsync(
    adminRouteClient,
    "/api/admin/business-applications/approve",
    {
      applicationId: approvedCandidate.id,
    }
  );

  if (duplicateApproveResult.status !== 200 || duplicateApproveResult.responseBody.status !== "APPLICATION_NOT_PENDING") {
    throw new Error(
      `Expected duplicate approve route to return 200 APPLICATION_NOT_PENDING, got ${duplicateApproveResult.status} ${duplicateApproveResult.responseBody.status}.`
    );
  }

  outputs.push(`duplicate-approve:${duplicateApproveResult.responseBody.status}`);

  const blankRejectResult = await invokeReviewRouteAsync(adminRouteClient, "/api/admin/business-applications/reject", {
    applicationId: forbiddenCandidate.id,
    rejectionReason: "   ",
  });

  if (blankRejectResult.status !== 400 || blankRejectResult.responseBody.status !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected blank reject route to return 400 VALIDATION_ERROR, got ${blankRejectResult.status} ${blankRejectResult.responseBody.status}.`
    );
  }

  outputs.push(`blank-reject:${blankRejectResult.responseBody.status}`);

  const invalidApproveResult = await invokeReviewRouteAsync(adminRouteClient, "/api/admin/business-applications/approve", {
    applicationId: "not-a-uuid",
  });

  if (invalidApproveResult.status !== 400 || invalidApproveResult.responseBody.status !== "VALIDATION_ERROR") {
    throw new Error(
      `Expected invalid approve route to return 400 VALIDATION_ERROR, got ${invalidApproveResult.status} ${invalidApproveResult.responseBody.status}.`
    );
  }

  outputs.push(`invalid-approve:${invalidApproveResult.responseBody.status}`);

  const organizerApproveResult = await invokeReviewRouteAsync(
    organizerRouteClient,
    "/api/admin/business-applications/approve",
    {
      applicationId: forbiddenCandidate.id,
    }
  );

  if (organizerApproveResult.status !== 403 || organizerApproveResult.responseBody.status !== "ADMIN_NOT_ALLOWED") {
    throw new Error(
      `Expected organizer approve route to return 403 ADMIN_NOT_ALLOWED, got ${organizerApproveResult.status} ${organizerApproveResult.responseBody.status}.`
    );
  }

  outputs.push(`organizer-approve:${organizerApproveResult.responseBody.status}`);

  await assertApplicationStateAsync(adminDataClient, approvedCandidate.id, "APPROVED", null);
  await assertApplicationStateAsync(adminDataClient, rejectedCandidate.id, "REJECTED", rejectReason);
  await assertApplicationStateAsync(adminDataClient, forbiddenCandidate.id, "PENDING", null);
  outputs.push("state-check:ok");

  await signOutAsync(adminDataClient);
  await signOutAsync(organizerDataClient);
  await signOutAsync(studentDataClient);
  await signOutAsync(adminRouteClient);
  await signOutAsync(organizerRouteClient);

  console.log(outputs.join("|"));
};

void run();
