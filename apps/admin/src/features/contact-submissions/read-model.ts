import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ContactSubmissionLocale,
  ContactSubmissionRecord,
  ContactSubmissionStatus,
  ContactSubmissionSubject,
  ContactSubmissionsCounts,
  ContactSubmissionsSnapshot,
} from "@/features/contact-submissions/types";

type ContactSubmissionRow = {
  attachment_path: string | null;
  created_at: string;
  email: string;
  id: string;
  message: string;
  name: string;
  organization: string | null;
  source_locale: ContactSubmissionLocale;
  status: ContactSubmissionStatus;
  subject: ContactSubmissionSubject;
};

const submissionsLimit = 100;
const signedUrlExpiresInSeconds = 60 * 30;

const buildEmptyCounts = (): ContactSubmissionsCounts => ({
  closed: 0,
  inReview: 0,
  new: 0,
  spam: 0,
  total: 0,
});

const incrementCount = (counts: ContactSubmissionsCounts, status: ContactSubmissionStatus): void => {
  counts.total += 1;
  if (status === "new") {
    counts.new += 1;
    return;
  }
  if (status === "in_review") {
    counts.inReview += 1;
    return;
  }
  if (status === "closed") {
    counts.closed += 1;
    return;
  }
  counts.spam += 1;
};

const createSignedAttachmentUrlAsync = async (
  supabase: SupabaseClient,
  attachmentPath: string
): Promise<string | null> => {
  const { data, error } = await supabase.storage
    .from("contact-attachments")
    .createSignedUrl(attachmentPath, signedUrlExpiresInSeconds);

  if (error !== null || data === null) {
    return null;
  }

  return data.signedUrl;
};

const mapRowAsync = async (
  supabase: SupabaseClient,
  row: ContactSubmissionRow
): Promise<ContactSubmissionRecord> => {
  const attachmentSignedUrl =
    row.attachment_path === null ? null : await createSignedAttachmentUrlAsync(supabase, row.attachment_path);

  return {
    attachmentPath: row.attachment_path,
    attachmentSignedUrl,
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    locale: row.source_locale,
    message: row.message,
    name: row.name,
    organization: row.organization,
    status: row.status,
    subject: row.subject,
  };
};

export const fetchContactSubmissionsSnapshotAsync = async (
  supabase: SupabaseClient
): Promise<ContactSubmissionsSnapshot> => {
  const { data, error } = await supabase
    .from("public_contact_submissions")
    .select(
      "id, created_at, subject, name, email, organization, message, attachment_path, source_locale, status"
    )
    .order("created_at", { ascending: false })
    .limit(submissionsLimit)
    .returns<ContactSubmissionRow[]>();

  if (error !== null) {
    throw new Error(`Failed to load contact submissions: ${error.message}`);
  }

  const counts = buildEmptyCounts();
  const records: ContactSubmissionRecord[] = [];

  for (const row of data) {
    incrementCount(counts, row.status);
    const record = await mapRowAsync(supabase, row);
    records.push(record);
  }

  return { counts, records };
};
