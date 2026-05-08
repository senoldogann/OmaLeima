import type { Metadata } from "next";

import { getBusinessApplicationContent } from "@/features/public-site/business-application-content";
import { BusinessApplicationPage } from "@/features/public-site/business-application-page";
import { publicSiteUrl } from "@/features/public-site/site-config";

const content = getBusinessApplicationContent("fi");

export const metadata: Metadata = {
  alternates: {
    canonical: "/apply",
    languages: {
      en: "/en/apply",
      fi: "/apply",
    },
  },
  description: content.metaDescription,
  openGraph: {
    description: content.metaDescription,
    locale: "fi_FI",
    title: content.metaTitle,
    type: "website",
    url: `${publicSiteUrl}/apply`,
  },
  title: content.metaTitle,
  twitter: {
    card: "summary_large_image",
    description: content.metaDescription,
    title: content.metaTitle,
  },
};

export default function ApplyPage() {
  return <BusinessApplicationPage locale="fi" />;
}
