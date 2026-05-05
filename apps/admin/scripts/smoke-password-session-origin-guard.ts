import { NextRequest } from "next/server";

import { validatePasswordSessionRequest } from "../src/features/auth/password-session-guard";

const requestUrl = "https://admin.omaleima.fi/auth/password-session";
const body = JSON.stringify({
  accessToken: "access-token",
  refreshToken: "refresh-token",
});

const createRequest = (headers: HeadersInit): NextRequest =>
  new NextRequest(requestUrl, {
    body,
    headers,
    method: "POST",
  });

const assertAsync = async (
  label: string,
  request: NextRequest,
  expectedStatus: number,
  expectedMessageFragment: string
): Promise<void> => {
  const response = validatePasswordSessionRequest(request);

  if (response === null) {
    throw new Error(`${label} unexpectedly passed validation.`);
  }

  if (response.status !== expectedStatus) {
    throw new Error(`${label} expected status ${expectedStatus}, got ${response.status}.`);
  }

  if (
    !response.error.toLowerCase().includes(expectedMessageFragment.toLowerCase())
  ) {
    throw new Error(`${label} response did not include expected error fragment ${expectedMessageFragment}.`);
  }
};

const runAsync = async (): Promise<void> => {
  await assertAsync(
    "cross-origin request",
    createRequest({
      "content-type": "application/json",
      origin: "https://evil.example",
    }),
    403,
    "same site"
  );

  await assertAsync(
    "wrong content type",
    createRequest({
      "content-type": "text/plain",
      origin: "https://admin.omaleima.fi",
      referer: "https://admin.omaleima.fi/login",
    }),
    415,
    "application/json"
  );

  console.log("password-session-origin-guard:OK");
};

void runAsync().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
