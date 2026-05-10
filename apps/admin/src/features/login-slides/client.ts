import type { LoginSlideMutationResponse, LoginSlidePayload } from "@/features/login-slides/types";

const parseLoginSlideResponseAsync = async (response: Response): Promise<LoginSlideMutationResponse> => {
  const responseBody = (await response.json()) as Partial<LoginSlideMutationResponse>;

  return {
    message:
      typeof responseBody.message === "string"
        ? responseBody.message
        : "Login slide request completed.",
    status: typeof responseBody.status === "string" ? responseBody.status : "UNKNOWN_STATUS",
  };
};

export const submitLoginSlideUpsertRequestAsync = async (
  payload: LoginSlidePayload
): Promise<LoginSlideMutationResponse> => {
  const response = await fetch("/api/admin/login-slides/upsert", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseLoginSlideResponseAsync(response);
};

export const submitLoginSlideDeleteRequestAsync = async (
  slideId: string
): Promise<LoginSlideMutationResponse> => {
  const response = await fetch("/api/admin/login-slides/delete", {
    body: JSON.stringify({
      slideId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  return parseLoginSlideResponseAsync(response);
};
