import type { Metadata } from "next";

import { getBusinessApplicationContent } from "@/features/public-site/business-application-content";
import { BusinessApplicationPage } from "@/features/public-site/business-application-page";

const content = getBusinessApplicationContent("en");

export const metadata: Metadata = {
  description: content.metaDescription,
  title: content.metaTitle,
};

export default function EnglishApplyPage() {
  return <BusinessApplicationPage locale="en" />;
}
