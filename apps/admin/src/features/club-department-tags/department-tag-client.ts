import type {
  ClubDepartmentTagCreatePayload,
  ClubDepartmentTagMutationResponse,
} from "@/features/club-department-tags/types";

export const clubDepartmentTagRefreshableStatuses = new Set(["SUCCESS"]);

export const submitClubDepartmentTagCreateRequestAsync = async (
  payload: ClubDepartmentTagCreatePayload
): Promise<ClubDepartmentTagMutationResponse> => {
  const response = await fetch("/api/club/department-tags/create", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const responseBody = (await response.json()) as Partial<ClubDepartmentTagMutationResponse>;

  return {
    message:
      typeof responseBody.message === "string"
        ? responseBody.message
        : "Official department tag request completed.",
    status: typeof responseBody.status === "string" ? responseBody.status : null,
  };
};
