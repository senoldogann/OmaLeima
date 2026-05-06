import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

import { createBrowserClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const dockerBinary = process.env.DOCKER_BINARY ?? "/usr/local/bin/docker";
const localDatabaseContainer = process.env.SUPABASE_DB_CONTAINER ?? "supabase_db_omaleima";

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
  hydrateFromResponse: (response: Response) => void;
  supabase: ReturnType<typeof createBrowserClient>;
  toCookieHeader: () => string;
};

type ReviewMutationResponse = {
  message?: string;
  status?: string;
};

type CleanupArtifacts = {
  applicationIds: string[];
  suffix: string;
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

const runSqlAsync = async (sql: string): Promise<void> => {
  execFileSync(
    dockerBinary,
    [
      "exec",
      localDatabaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      sql,
    ],
    {
      stdio: "pipe",
    }
  );
};

const runSqlJsonAsync = <T,>(sql: string): T => {
  const output = execFileSync(
    dockerBinary,
    [
      "exec",
      localDatabaseContainer,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "-v",
      "ON_ERROR_STOP=1",
      "-t",
      "-A",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      stdio: "pipe",
    }
  ).trim();
  const jsonLine = output
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("{") || line.startsWith("["));

  if (typeof jsonLine === "undefined") {
    throw new Error(`Expected SQL JSON output, got: ${output}`);
  }

  return JSON.parse(jsonLine) as T;
};

const sqlLiteral = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const createCookieBackedClientAsync = async (email: string, password: string): Promise<CookieBackedClient> => {
  const cookieJar = new Map<string, string>();
  const hydrateFromResponse = (response: Response): void => {
    const getSetCookie = response.headers.getSetCookie?.bind(response.headers);
    const setCookieValues = typeof getSetCookie === "function"
      ? getSetCookie()
      : [];

    for (const setCookieValue of setCookieValues) {
      const [nameValuePair] = setCookieValue.split(";", 1);
      const separatorIndex = nameValuePair.indexOf("=");

      if (separatorIndex <= 0) {
        continue;
      }

      const name = nameValuePair.slice(0, separatorIndex);
      const value = nameValuePair.slice(separatorIndex + 1);

      cookieJar.set(name, value);
    }
  };
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
    hydrateFromResponse,
    supabase,
    toCookieHeader: () =>
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
  };
};

const insertPendingApplicationAsync = async (
  suffix: string,
  createdAt: string,
  websiteUrl: string
): Promise<BusinessApplicationRow> => {
  return runSqlJsonAsync<BusinessApplicationRow>(`
    insert into public.business_applications (
      address,
      business_name,
      city,
      contact_email,
      contact_name,
      country,
      created_at,
      message,
      status,
      website_url
    )
    values (
      ${sqlLiteral(`${suffix} Street 1`)},
      ${sqlLiteral(`Smoke Venue ${suffix}`)},
      'Helsinki',
      ${sqlLiteral(`smoke-${suffix.toLowerCase()}@example.test`)},
      'Smoke Operator',
      'Finland',
      ${sqlLiteral(createdAt)}::timestamptz,
      ${sqlLiteral(`Smoke queue check ${suffix}`)},
      'PENDING',
      ${sqlLiteral(websiteUrl)}
    )
    returning json_build_object(
      'id', id,
      'business_name', business_name,
      'status', status,
      'rejection_reason', rejection_reason
    );
  `);
};

const insertPendingApplicationBatchAsync = async (
  suffix: string,
  count: number,
  createdAtStart: number
): Promise<BusinessApplicationRow[]> => {
  const rowsSql = Array.from({ length: count }, (_, index) => {
    const rowSuffix = `${suffix}-BATCH-${index + 1}`;

    return `(
      ${sqlLiteral(`${rowSuffix} Street 1`)},
      ${sqlLiteral(`Smoke Venue ${rowSuffix}`)},
      'Helsinki',
      ${sqlLiteral(`smoke-${suffix.toLowerCase()}-batch-${index + 1}@example.test`)},
      'Smoke Operator',
      'Finland',
      ${sqlLiteral(new Date(createdAtStart + index * 1000).toISOString())}::timestamptz,
      ${sqlLiteral(`Smoke queue batch ${suffix}-${index + 1}`)},
      'PENDING',
      'https://example.test/review'
    )`;
  }).join(",\n");

  return runSqlJsonAsync<BusinessApplicationRow[]>(`
    with inserted as (
      insert into public.business_applications (
        address,
        business_name,
        city,
        contact_email,
        contact_name,
        country,
        created_at,
        message,
        status,
        website_url
      )
      values ${rowsSql}
      returning id, business_name, status, rejection_reason, created_at
    )
    select coalesce(json_agg(json_build_object(
      'id', id,
      'business_name', business_name,
      'status', status,
      'rejection_reason', rejection_reason
    ) order by created_at), '[]'::json)
    from inserted;
  `);
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
  client.hydrateFromResponse(response);
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
  client.hydrateFromResponse(response);
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

const cleanupBusinessApplicationsAsync = async (
  _client: AuthedClient,
  artifacts: CleanupArtifacts
): Promise<void> => {
  if (artifacts.applicationIds.length === 0 && artifacts.suffix.length === 0) {
    return;
  }

  const sql = `
    begin;
    with smoke_application_ids as (
      select id
      from public.business_applications
      where business_name like 'Smoke Venue ${artifacts.suffix}%'
    )
    delete from public.audit_logs
    where resource_type = 'business_applications'
      and resource_id in (select id from smoke_application_ids);

    delete from public.businesses
    where application_id in (
      select id
      from public.business_applications
      where business_name like 'Smoke Venue ${artifacts.suffix}%'
    );

    delete from public.business_applications
    where business_name like 'Smoke Venue ${artifacts.suffix}%';
    commit;
  `;

  await runSqlAsync(sql);
};

const run = async (): Promise<void> => {
  const suffix = randomUUID().slice(0, 8).toUpperCase();
  const createdAtBase = Date.now();
  const adminDataClient = await createAuthedClientAsync("admin@omaleima.test", "password123");
  const organizerDataClient = await createAuthedClientAsync("organizer@omaleima.test", "password123");
  const studentDataClient = await createAuthedClientAsync("student@omaleima.test", "password123");
  const adminRouteClient = await createCookieBackedClientAsync("admin@omaleima.test", "password123");
  const organizerRouteClient = await createCookieBackedClientAsync("organizer@omaleima.test", "password123");
  const outputs: string[] = [];
  const artifacts: CleanupArtifacts = {
    applicationIds: [],
    suffix,
  };

  try {
    const existingPendingCount = await fetchPendingApplicationCountAsync(adminDataClient);
    const approvedCandidate = await insertPendingApplicationAsync(
      `${suffix}-APPROVE`,
      new Date(createdAtBase).toISOString(),
      "https://example.test/review"
    );
    const rejectedCandidate = await insertPendingApplicationAsync(
      `${suffix}-REJECT`,
      new Date(createdAtBase + 1000).toISOString(),
      "https://example.test/review"
    );
    const unsafeWebsiteValue = "javascript:alert('xss')";
    const forbiddenCandidate = await insertPendingApplicationAsync(
      `${suffix}-DENY`,
      new Date(createdAtBase + 2000).toISOString(),
      unsafeWebsiteValue
    );
    const paginatedCandidates = await insertPendingApplicationBatchAsync(
      suffix,
      18,
      createdAtBase + 3000
    );

    artifacts.applicationIds = [
      approvedCandidate.id,
      rejectedCandidate.id,
      forbiddenCandidate.id,
      ...paginatedCandidates.map((candidate) => candidate.id),
    ];

    const pageSize = 20;
    const approvedCandidatePage = Math.ceil((existingPendingCount + 1) / pageSize);
    const forbiddenCandidatePage = Math.ceil((existingPendingCount + 3) / pageSize);
    const lastPaginatedCandidate = paginatedCandidates[paginatedCandidates.length - 1];
    const lastPaginatedCandidatePage = Math.ceil((existingPendingCount + artifacts.applicationIds.length) / pageSize);

    await assertAdminVisibleRowsAsync(adminDataClient, artifacts.applicationIds);
    outputs.push(`admin-read:${artifacts.applicationIds.length}`);

    await assertRowsHiddenAsync(organizerDataClient, artifacts.applicationIds);
    outputs.push("organizer-read:0");

    await assertRowsHiddenAsync(studentDataClient, artifacts.applicationIds);
    outputs.push("student-read:0");

    await assertPageContainsQueueAsync(adminRouteClient, approvedCandidatePage, approvedCandidate.business_name, null);
    outputs.push("admin-route-content:ok");

    await assertPageContainsQueueAsync(
      adminRouteClient,
      forbiddenCandidatePage,
      forbiddenCandidate.business_name,
      unsafeWebsiteValue
    );
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

    console.log(outputs.join("|"));
  } finally {
    try {
      await cleanupBusinessApplicationsAsync(adminDataClient, artifacts);
    } finally {
      await signOutAsync(adminDataClient);
      await signOutAsync(organizerDataClient);
      await signOutAsync(studentDataClient);
      await signOutAsync(adminRouteClient);
      await signOutAsync(organizerRouteClient);
    }
  }
};

void run();
