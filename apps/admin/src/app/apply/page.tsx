import type { Metadata } from "next";

import { getBusinessApplicationContent } from "@/features/public-site/business-application-content";
import { BusinessApplicationPage } from "@/features/public-site/business-application-page";

const content = getBusinessApplicationContent("fi");

export const metadata: Metadata = {
  description: content.metaDescription,
  title: content.metaTitle,
};

export default function ApplyPage() {
  return <BusinessApplicationPage locale="fi" />;
}
