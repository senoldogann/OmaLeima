import { createBrowserClient } from "@supabase/ssr";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const appBaseUrl = process.env.ADMIN_APP_BASE_URL ?? "http://localhost:3001";

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
