import { z } from "zod";

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  EXPO_PUBLIC_EAS_PROJECT_ID: z.string().uuid().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

const formatEnvErrors = (issues: z.ZodIssue[]): string =>
  issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");

const readPublicEnv = (): PublicEnv => {
  const parsedEnv = publicEnvSchema.safeParse({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });

  if (!parsedEnv.success) {
    throw new Error(`Invalid Expo public environment variables. ${formatEnvErrors(parsedEnv.error.issues)}`);
  }

  return parsedEnv.data;
};

export const publicEnv = readPublicEnv();
