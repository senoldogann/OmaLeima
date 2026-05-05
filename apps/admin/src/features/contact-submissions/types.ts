// Public site contact form üzerinden gelen başvurular için tip tanımları.

export type ContactSubmissionStatus = "new" | "in_review" | "closed" | "spam";

export type ContactSubmissionSubject =
  | "business_signup"
  | "collaboration"
  | "pilot"
  | "press"
  | "other";

export type ContactSubmissionLocale = "fi" | "en";

export type ContactSubmissionRecord = {
  attachmentPath: string | null;
  attachmentSignedUrl: string | null;
  createdAt: string;
  email: string;
  id: string;
  locale: ContactSubmissionLocale;
  message: string;
  name: string;
  organization: string | null;
  status: ContactSubmissionStatus;
  subject: ContactSubmissionSubject;
};

export type ContactSubmissionsCounts = {
  closed: number;
  inReview: number;
  new: number;
  spam: number;
  total: number;
};

export type ContactSubmissionsSnapshot = {
  counts: ContactSubmissionsCounts;
  records: ContactSubmissionRecord[];
};
