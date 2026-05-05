import type { Metadata } from "next";

import { PublicLegalPage } from "@/features/public-site/legal-page";
import { getLegalDocumentContent } from "@/features/public-site/legal-content";

const content = getLegalDocumentContent("en", "privacy");

export const metadata: Metadata = {
  alternates: {
    canonical: "/en/privacy",
    languages: {
      en: "/en/privacy",
      fi: "/privacy",
    },
  },
  description: content.metaDescription,
  title: content.title,
};

export default function EnglishPrivacyPage() {
  return <PublicLegalPage documentType="privacy" locale="en" />;
}
