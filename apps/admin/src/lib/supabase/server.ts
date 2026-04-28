import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { publicEnv } from "@/lib/env";

const isReadOnlyCookieStoreError = (error: unknown): boolean =>
  error instanceof Error &&
  (error.message.includes("Cookies can only be modified") || error.message.includes("ReadonlyRequestCookies"));

const createClientWithCookieStore = async (
  setAll: (cookiesToSet: { name: string; value: string; options: object }[]) => void
) => {
  const cookieStore = await cookies();

  return createServerClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          setAll(
            cookiesToSet.map(({ name, value, options }) => ({
              name,
              value,
              options,
            }))
          );
        },
      },
    }
  );
};

export const createServerComponentClient = async () =>
  createClientWithCookieStore((cookiesToSet) => {
    const cookieStore = cookies();

    return cookieStore.then((resolvedCookieStore) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          resolvedCookieStore.set(name, value, options);
        });
      } catch (error) {
        if (isReadOnlyCookieStoreError(error)) {
          return;
        }

        throw error;
      }
    });
  });

export const createRouteHandlerClient = async () =>
  createClientWithCookieStore((cookiesToSet) => {
    const cookieStore = cookies();

    return cookieStore.then((resolvedCookieStore) => {
      cookiesToSet.forEach(({ name, value, options }) => {
        resolvedCookieStore.set(name, value, options);
      });
    });
  });
