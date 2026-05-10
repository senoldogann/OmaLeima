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

const softwareApplicationJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  applicationCategory: "LifestyleApplication",
  description: content.metaDescription,
  inLanguage: "fi-FI",
  name: "OmaLeima",
  operatingSystem: "iOS, Android, Web",
  url: publicSiteUrl,
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  areaServed: {
    "@type": "Country",
    name: "Finland",
  },
  audience: [
    {
      "@type": "Audience",
      audienceType: "Student event organizers",
    },
    {
      "@type": "Audience",
      audienceType: "Student-friendly venues and businesses",
    },
  ],
  description: content.metaDescription,
  name: "Digital leima pass for Finnish student events",
  provider: {
    "@type": "Organization",
    name: "OmaLeima",
    url: publicSiteUrl,
  },
  serviceType: "Digital stamp card, QR checkpoint, and student event reward operations",
  url: publicSiteUrl,
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: content.faqItems.map((item) => ({
    "@type": "Question",
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
    name: item.question,
  })),
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
        height: 1024,
        url: "/images/public/scene-hero-appro-night-v2.png",
        width: 1536,
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
    images: ["/images/public/scene-hero-appro-night-v2.png"],
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
      <script
        dangerouslySetInnerHTML={renderJsonLd(softwareApplicationJsonLd)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={renderJsonLd(serviceJsonLd)}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={renderJsonLd(faqJsonLd)}
        type="application/ld+json"
      />
      <PublicLandingPage locale={locale} />
    </>
  );
}
