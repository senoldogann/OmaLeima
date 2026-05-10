"use client";

import { useEffect } from "react";

import {
  dashboardCsrfCookieName,
  dashboardCsrfHeaderName,
} from "@/features/security/dashboard-mutation-request";

const readCookie = (name: string): string | null => {
  const cookiePrefix = `${name}=`;
  const cookieValue = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(cookiePrefix));

  if (typeof cookieValue !== "string") {
    return null;
  }

  return decodeURIComponent(cookieValue.slice(cookiePrefix.length));
};

const isSameOriginApiMutation = (input: RequestInfo | URL, init: RequestInit | undefined): boolean => {
  const method = init?.method?.toUpperCase() ?? "GET";

  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return false;
  }

  const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
  const targetUrl = new URL(url, window.location.origin);

  return targetUrl.origin === window.location.origin && targetUrl.pathname.startsWith("/api/");
};

const withCsrfHeader = (init: RequestInit | undefined): RequestInit => {
  const token = readCookie(dashboardCsrfCookieName);

  if (token === null) {
    return init ?? {};
  }

  const headers = new Headers(init?.headers);
  headers.set(dashboardCsrfHeaderName, token);

  return {
    ...init,
    headers,
  };
};

export const DashboardFetchGuard = () => {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (!isSameOriginApiMutation(input, init)) {
        return originalFetch(input, init);
      }

      return originalFetch(input, withCsrfHeader(init));
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
};
