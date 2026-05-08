"use client";

import { useEffect, useRef } from "react";

export const successNoticeDurationMs = 3000;

export const useTransientSuccessKey = (
  successKey: string | null,
  clearSuccess: () => void,
  delayMs: number
): void => {
  const clearSuccessRef = useRef<() => void>(clearSuccess);

  useEffect(() => {
    clearSuccessRef.current = clearSuccess;
  }, [clearSuccess]);

  useEffect(() => {
    if (successKey === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      clearSuccessRef.current();
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [delayMs, successKey]);
};
