import type { Metadata } from "next";

import { getPublicLandingContent, publicSiteUrl } from "@/features/public-site/content";
import { PublicLandingPage } from "@/features/public-site/landing-page";

const locale = "fi";
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
  inLanguage: ["fi-FI", "en"],
  name: "OmaLeima",
  url: publicSiteUrl,
};

const renderJsonLd = (value: Record<string, unknown>) => ({
  __html: JSON.stringify(value),
});

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
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
        height: 941,
        url: "/images/public/scene-haalarit-hero.png",
        width: 1672,
      },
    ],
    locale: content.ogLocale,
    title: content.heroTitle,
    type: "website",
    url: publicSiteUrl,
  },
  title: content.heroTitle,
  twitter: {
    card: "summary_large_image",
    description: content.metaDescription,
    images: ["/images/public/scene-haalarit-hero.png"],
    title: content.heroTitle,
  },
};

export default function Home() {
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
