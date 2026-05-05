import type { Metadata } from "next";

import { PublicLegalPage } from "@/features/public-site/legal-page";
import { getLegalDocumentContent } from "@/features/public-site/legal-content";

const content = getLegalDocumentContent("fi", "terms");

export const metadata: Metadata = {
  alternates: {
    canonical: "/terms",
    languages: {
      en: "/en/terms",
      fi: "/terms",
    },
  },
  description: content.metaDescription,
  title: content.title,
};

export default function TermsPage() {
  return <PublicLegalPage documentType="terms" locale="fi" />;
}
