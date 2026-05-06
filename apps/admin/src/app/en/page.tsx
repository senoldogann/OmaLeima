import type { Metadata } from "next";

import { getPublicLandingContent, publicSiteUrl } from "@/features/public-site/content";
import { PublicLandingPage } from "@/features/public-site/landing-page";

const locale = "en";
const content = getPublicLandingContent(locale);

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  email: "contact@omaleima.fi",
  logo: `${publicSiteUrl}/images/omaleima-logo.png`,
  name: "OmaLeima",
  sameAs: ["https://www.instagram.com/omaleima/"],
  url: publicSiteUrl,
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  inLanguage: ["en", "fi-FI"],
  name: "OmaLeima",
  url: `${publicSiteUrl}/en`,
};

const renderJsonLd = (value: Record<string, unknown>) => ({
  __html: JSON.stringify(value),
});

export const metadata: Metadata = {
  alternates: {
    canonical: "/en",
    languages: {
      en: "/en",
      fi: "/",
    },
  },
  description: content.metaDescription,
  openGraph: {
    description: content.metaDescription,
    images: [
      {
        alt: "OmaLeima student event hero",
        height: 1024,
        url: "/images/public/scene-hero-appro-night-v2.png",
        width: 1536,
      },
    ],
    locale: content.ogLocale,
    title: content.heroTitle,
    type: "website",
    url: `${publicSiteUrl}/en`,
  },
  title: content.heroTitle,
  twitter: {
    card: "summary_large_image",
    description: content.metaDescription,
    images: ["/images/public/scene-hero-appro-night-v2.png"],
    title: content.heroTitle,
  },
};
export default function EnglishHome() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={renderJsonLd(organizationJsonLd)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={renderJsonLd(websiteJsonLd)}
        type="application/ld+json"
      />
      <PublicLandingPage locale={locale} />
    </>
  );
}
