export type BusinessScanStatus =
  | "SUCCESS"
  | "QR_ALREADY_USED_OR_REPLAYED"
  | "ALREADY_STAMPED"
  | "EVENT_NOT_FOUND"
  | "INVALID_QR"
  | "INVALID_QR_TYPE"
  | "QR_EXPIRED"
  | "VENUE_NOT_IN_EVENT"
  | "EVENT_NOT_ACTIVE"
  | "STUDENT_NOT_REGISTERED"
  | "VENUE_JOINED_TOO_LATE"
  | "BUSINESS_STAFF_NOT_ALLOWED"
  | "NOT_BUSINESS_STAFF"
  | "BUSINESS_CONTEXT_REQUIRED";

export type ScannerResultTone = "success" | "warning" | "danger" | "neutral";

export type ScannerAttemptResult = {
  status: BusinessScanStatus | "NETWORK_TIMEOUT";
  message: string;
  tone: ScannerResultTone;
  stampId?: string;
  stampCount?: number;
};

export type ScanQrResponse = {
  status: BusinessScanStatus;
  message: string;
  stampId?: string;
  stampCount?: number;
};
