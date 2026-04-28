import type { BusinessApplicationStatus } from "@/features/business-applications/types";

const dateTimeFormatter = new Intl.DateTimeFormat("en-FI", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatBusinessApplicationDateTime = (value: string | null): string => {
  if (value === null) {
    return "Not reviewed yet";
  }

  return dateTimeFormatter.format(new Date(value));
};

export const formatBusinessApplicationLocation = (city: string, country: string): string => `${city}, ${country}`;

export const formatBusinessApplicationStatus = (status: BusinessApplicationStatus): string => {
  if (status === "PENDING") {
    return "Pending";
  }

  if (status === "APPROVED") {
    return "Approved";
  }

  return "Rejected";
};
