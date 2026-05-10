"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export const SignOutButton = () => {
  const router = useRouter();
  const [isPending, setIsPending] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmPending, setConfirmPending] = useState<boolean>(false);

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
      {!confirmPending ? (
        <button
          className="button button-ghost sign-out-btn"
          disabled={isPending}
          onClick={() => setConfirmPending(true)}
          type="button"
        >
          Sign out
        </button>
      ) : (
        <div className="sign-out-confirm">
          <p className="muted-text sign-out-confirm-label">Kirjaudutaanko ulos?</p>
          <div className="sign-out-confirm-row">
            <button
              className="button button-danger"
              disabled={isPending}
              onClick={() => void handleSignOut()}
              type="button"
            >
              {isPending ? "Kirjaudutaan ulos..." : "Kyllä, kirjaudu ulos"}
            </button>
            <button
              className="button button-secondary"
              disabled={isPending}
              onClick={() => setConfirmPending(false)}
              type="button"
            >
              Peruuta
            </button>
          </div>
          {errorMessage !== null ? <p className="inline-error">{errorMessage}</p> : null}
        </div>
      )}
    </div>
  );
};
