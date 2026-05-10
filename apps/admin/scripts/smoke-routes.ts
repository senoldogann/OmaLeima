import { createBrowserClient } from "@supabase/ssr";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";
const allowNonLocalRouteSmoke = process.env.ADMIN_ROUTE_SMOKE_ALLOW_NON_LOCAL === "1";

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for admin route smoke script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for admin route smoke script.");
}

type RouteSmokeCase = {
  email: string;
  expectedLocation: string | null;
  expectedStatus: 200 | 307;
  password: string;
  path:
    | "/admin"
    | "/admin/business-applications"
    | "/admin/department-tags"
    | "/admin/oversight"
    | "/club"
    | "/club/department-tags"
    | "/club/claims"
    | "/club/events"
    | "/club/rewards"
    | "/login";
};

const localHostnames = new Set<string>(["localhost", "127.0.0.1", "::1"]);

const parseUrlOrThrow = (value: string, label: string): URL => {
  try {
    return new URL(value);
  } catch (error) {
    throw new Error(`${label} must be a valid absolute URL. ${error instanceof Error ? error.message : "Unknown URL parse error."}`);
  }
};

const assertLocalUrlOrThrow = (value: string, label: string): void => {
  if (allowNonLocalRouteSmoke) {
    return;
  }

  const parsedUrl = parseUrlOrThrow(value, label);

  if (localHostnames.has(parsedUrl.hostname)) {
    return;
  }

  throw new Error(
    `${label} must point to localhost for smoke:routes. This script uses local seeded accounts. ` +
      `Use smoke:hosted-admin-access for hosted checks, or set ADMIN_ROUTE_SMOKE_ALLOW_NON_LOCAL=1 intentionally.`
  );
};

const assertLoginPageReachableAsync = async (): Promise<void> => {
  let response: Response;

  try {
    response = await fetch(`${appBaseUrl}/login`, {
      method: "GET",
      redirect: "manual",
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${appBaseUrl}/login before route smoke: ` +
        `${error instanceof Error ? error.message : "unknown fetch error"}. ` +
        "Start the admin app with `npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001` or set ADMIN_APP_BASE_URL."
    );
  }

  if (response.status !== 200) {
    throw new Error(
      `Expected ${appBaseUrl}/login to return 200 before route smoke, got ${response.status}. ` +
        "Start the admin app with `npm --prefix apps/admin run dev -- --hostname 127.0.0.1 --port 3001` or set ADMIN_APP_BASE_URL."
    );
  }
};

const routeSmokeCases: RouteSmokeCase[] = [
  {
    email: "admin@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/admin",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/club",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/club/department-tags",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/club/claims",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/club/events",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/club/rewards",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: "/club",
    expectedStatus: 307,
    password: "password123",
    path: "/admin",
  },
  {
    email: "admin@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/admin/business-applications",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: "/club",
    expectedStatus: 307,
    password: "password123",
    path: "/admin/business-applications",
  },
  {
    email: "admin@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/admin/oversight",
  },
  {
    email: "admin@omaleima.test",
    expectedLocation: null,
    expectedStatus: 200,
    password: "password123",
    path: "/admin/department-tags",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: "/club",
    expectedStatus: 307,
    password: "password123",
    path: "/admin/oversight",
  },
  {
    email: "organizer@omaleima.test",
    expectedLocation: "/club",
    expectedStatus: 307,
    password: "password123",
    path: "/admin/department-tags",
  },
  {
    email: "student@omaleima.test",
    expectedLocation: "/forbidden",
    expectedStatus: 307,
    password: "password123",
    path: "/admin",
  },
  {
    email: "student@omaleima.test",
    expectedLocation: "/forbidden",
    expectedStatus: 307,
    password: "password123",
    path: "/club/department-tags",
  },
  {
    email: "student@omaleima.test",
    expectedLocation: "/forbidden",
    expectedStatus: 307,
    password: "password123",
    path: "/club/claims",
  },
  {
    email: "student@omaleima.test",
    expectedLocation: "/forbidden",
    expectedStatus: 307,
    password: "password123",
    path: "/club/events",
  },
  {
    email: "student@omaleima.test",
    expectedLocation: "/forbidden",
    expectedStatus: 307,
    password: "password123",
    path: "/club/rewards",
  },
];

const createCookieBackedClient = () => {
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

  return {
    supabase,
    toCookieHeader: () =>
      Array.from(cookieJar.entries())
        .map(([name, value]) => `${name}=${value}`)
        .join("; "),
  };
};

const run = async (): Promise<void> => {
  const outputs: string[] = [];

  assertLocalUrlOrThrow(appBaseUrl, "ADMIN_APP_BASE_URL");
  assertLocalUrlOrThrow(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL");
  await assertLoginPageReachableAsync();

  for (const routeSmokeCase of routeSmokeCases) {
    const client = createCookieBackedClient();
    const signInResult = await client.supabase.auth.signInWithPassword({
      email: routeSmokeCase.email,
      password: routeSmokeCase.password,
    });

    if (signInResult.error !== null) {
      throw new Error(`Failed to sign in ${routeSmokeCase.email} for route smoke: ${signInResult.error.message}`);
    }

    const response = await fetch(`${appBaseUrl}${routeSmokeCase.path}`, {
      headers: {
        Cookie: client.toCookieHeader(),
      },
      method: "GET",
      redirect: "manual",
    });

    if (response.status !== routeSmokeCase.expectedStatus) {
      throw new Error(
        `Expected ${routeSmokeCase.email} ${routeSmokeCase.path} to return ${routeSmokeCase.expectedStatus}, got ${response.status}.`
      );
    }

    const location = response.headers.get("location");

    if (location !== routeSmokeCase.expectedLocation) {
      throw new Error(
        `Expected ${routeSmokeCase.email} ${routeSmokeCase.path} to redirect to ${routeSmokeCase.expectedLocation}, got ${location}.`
      );
    }

    outputs.push(`${routeSmokeCase.email}:${routeSmokeCase.path}:${response.status}:${location ?? "ok"}`);

    const signOutResult = await client.supabase.auth.signOut();

    if (signOutResult.error !== null) {
      throw new Error(`Failed to sign out ${routeSmokeCase.email} after route smoke: ${signOutResult.error.message}`);
    }
  }

  console.log(outputs.join("|"));
};

void run();
