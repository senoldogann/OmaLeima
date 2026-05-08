import { createClient } from "@supabase/supabase-js";

process.loadEnvFile?.(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (typeof supabaseUrl !== "string" || supabaseUrl.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL for admin smoke auth script.");
}

if (typeof publishableKey !== "string" || publishableKey.length === 0) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY for admin smoke auth script.");
}

type SmokeCase = {
  email: string;
  expectedArea: "admin" | "club" | "unsupported";
  expectedHomeHref: "/admin" | "/club" | "/forbidden";
  password: string;
};

const smokeCases: SmokeCase[] = [
  {
    email: "admin@omaleima.test",
    expectedArea: "admin",
    expectedHomeHref: "/admin",
    password: "password123",
  },
  {
    email: "organizer@omaleima.test",
    expectedArea: "club",
    expectedHomeHref: "/club",
    password: "password123",
  },
  {
    email: "student@omaleima.test",
    expectedArea: "unsupported",
    expectedHomeHref: "/forbidden",
    password: "password123",
  },
];

const createAuthedClient = async (email: string, password: string) => {
  const supabase = createClient(
    supabaseUrl,
    publishableKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInResult.error !== null) {
    throw new Error(`Failed to sign in seeded smoke account ${email}: ${signInResult.error.message}`);
  }

  const userId = signInResult.data.user?.id;

  if (typeof userId !== "string") {
    throw new Error(`Sign-in returned no user id for ${email}.`);
  }

  return {
    supabase,
    userId,
  };
};

const run = async (): Promise<void> => {
  const { resolveAdminAccessByUserIdAsync } = await import("@/features/auth/access");
  const output: string[] = [];

  for (const smokeCase of smokeCases) {
    const { supabase, userId } = await createAuthedClient(smokeCase.email, smokeCase.password);
    const access = await resolveAdminAccessByUserIdAsync(supabase, userId);

    if (access.area !== smokeCase.expectedArea) {
      throw new Error(
        `Expected ${smokeCase.email} to resolve area ${smokeCase.expectedArea}, got ${access.area}.`
      );
    }

    if (access.homeHref !== smokeCase.expectedHomeHref) {
      throw new Error(
        `Expected ${smokeCase.email} to resolve home ${smokeCase.expectedHomeHref}, got ${access.homeHref}.`
      );
    }

    output.push(`${smokeCase.email}:${access.area}:${access.homeHref}`);

    const signOutResult = await supabase.auth.signOut();

    if (signOutResult.error !== null) {
      throw new Error(`Failed to sign out smoke account ${smokeCase.email}: ${signOutResult.error.message}`);
    }
  }

  console.log(output.join("|"));
};

void run();
