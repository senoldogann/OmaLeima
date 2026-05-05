import type { Metadata } from "next";

import { PublicLegalPage } from "@/features/public-site/legal-page";
import { getLegalDocumentContent } from "@/features/public-site/legal-content";

const content = getLegalDocumentContent("fi", "privacy");

export const metadata: Metadata = {
  alternates: {
    canonical: "/privacy",
    languages: {
      en: "/en/privacy",
      fi: "/privacy",
    },
  },
  description: content.metaDescription,
  title: content.title,
};

export default function PrivacyPage() {
  return <PublicLegalPage documentType="privacy" locale="fi" />;
}
