import type {
  ClubDepartmentTagCreatePayload,
  ClubDepartmentTagDeletePayload,
  ClubDepartmentTagMutationResponse,
  ClubDepartmentTagUpdatePayload,
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

export const submitClubDepartmentTagUpdateRequestAsync = async (
  payload: ClubDepartmentTagUpdatePayload
): Promise<ClubDepartmentTagMutationResponse> => {
  const response = await fetch("/api/club/department-tags/update", {
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
        : "Official department tag update completed.",
    status: typeof responseBody.status === "string" ? responseBody.status : null,
  };
};

export const submitClubDepartmentTagDeleteRequestAsync = async (
  payload: ClubDepartmentTagDeletePayload
): Promise<ClubDepartmentTagMutationResponse> => {
  const response = await fetch("/api/club/department-tags/delete", {
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
        : "Official department tag delete completed.",
    status: typeof responseBody.status === "string" ? responseBody.status : null,
  };
};
