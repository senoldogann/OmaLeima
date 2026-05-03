export type FraudSignalResolutionStatus = "REVIEWED" | "DISMISSED" | "CONFIRMED";

export type FraudSignalActionState = {
  code: string | null;
  message: string | null;
  tone: "idle" | "success" | "error";
};

export type FraudSignalReviewMutationResponse = {
  message: string;
  status: string | null;
};
