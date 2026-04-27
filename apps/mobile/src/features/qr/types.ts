export type RegisteredQrEvent = {
  id: string;
  name: string;
  city: string;
  startAt: string;
  endAt: string;
  minimumStampsRequired: number;
  status: "PUBLISHED" | "ACTIVE";
};

export type StudentQrContext = {
  studentDisplayName: string;
  registeredEvents: RegisteredQrEvent[];
};

export type StudentQrEventState = "ACTIVE" | "UPCOMING";

export type SelectedStudentQrEvent = RegisteredQrEvent & {
  viewState: StudentQrEventState;
};

export type GenerateQrTokenResponse = {
  qrPayload: {
    v: number;
    type: "LEIMA_STAMP_QR";
    token: string;
  };
  expiresAt: string;
  refreshAfterSeconds: number;
};

export type QrProtectionStatus = "ACTIVE" | "UNAVAILABLE" | "WEB_PREVIEW" | "ERROR";
