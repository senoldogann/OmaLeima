import type { Metadata } from "next";

import { getBusinessApplicationContent } from "@/features/public-site/business-application-content";
import { BusinessApplicationPage } from "@/features/public-site/business-application-page";
import { publicSiteUrl } from "@/features/public-site/site-config";

const content = getBusinessApplicationContent("en");

export const metadata: Metadata = {
  alternates: {
    canonical: "/en/apply",
    languages: {
      en: "/en/apply",
      fi: "/apply",
    },
  },
  description: content.metaDescription,
  openGraph: {
    description: content.metaDescription,
    locale: "en_US",
    title: content.metaTitle,
    type: "website",
    url: `${publicSiteUrl}/en/apply`,
  },
  title: content.metaTitle,
  twitter: {
    card: "summary_large_image",
    description: content.metaDescription,
    title: content.metaTitle,
  },
};

export default function EnglishApplyPage() {
  return <BusinessApplicationPage locale="en" />;
}
