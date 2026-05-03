const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class FraudSignalReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FraudSignalReviewValidationError";
  }
}

export const isUuid = (value: string): boolean => uuidPattern.test(value);

const allowedStatuses = new Set<string>(["REVIEWED", "DISMISSED", "CONFIRMED"]);

export type FraudSignalReviewPayload = {
  resolutionNote: string;
  signalId: string;
  status: "REVIEWED" | "DISMISSED" | "CONFIRMED";
};

export const parseFraudSignalReviewPayloadOrThrow = (
  body: Record<string, unknown>
): FraudSignalReviewPayload => {
  if (typeof body.signalId !== "string" || !isUuid(body.signalId)) {
    throw new FraudSignalReviewValidationError("signalId must be a valid UUID.");
  }

  if (typeof body.status !== "string") {
    throw new FraudSignalReviewValidationError("status must be a string.");
  }

  const status = body.status.trim().toUpperCase();

  if (!allowedStatuses.has(status)) {
    throw new FraudSignalReviewValidationError("status must be REVIEWED, DISMISSED, or CONFIRMED.");
  }

  if (typeof body.resolutionNote !== "string") {
    throw new FraudSignalReviewValidationError("resolutionNote must be a string.");
  }

  const resolutionNote = body.resolutionNote.trim();

  if (resolutionNote.length > 500) {
    throw new FraudSignalReviewValidationError("resolutionNote must be 500 characters or fewer.");
  }

  return {
    resolutionNote,
    signalId: body.signalId,
    status: status as FraudSignalReviewPayload["status"],
  };
};
