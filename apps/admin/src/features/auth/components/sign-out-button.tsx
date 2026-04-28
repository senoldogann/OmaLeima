"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export const SignOutButton = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignOut = async (): Promise<void> => {
    setIsPending(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const signOutResult = await supabase.auth.signOut();

      if (signOutResult.error !== null) {
        throw new Error(signOutResult.error.message);
      }

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unknown sign-out error.");
      setIsPending(false);
      return;
    }

    setIsPending(false);
  };

  return (
    <div className="stack-sm">
      <button className="button button-secondary" disabled={isPending} onClick={() => void handleSignOut()} type="button">
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}
    </div>
  );
};
