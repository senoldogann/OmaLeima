import Link from "next/link";

import { getPublicLandingContent } from "@/features/public-site/content";
import {
  getLegalDocumentContent,
  type LegalDocumentType,
} from "@/features/public-site/legal-content";
import { PublicFooter } from "@/features/public-site/public-footer";
import { ScrollRevealProvider } from "@/features/public-site/scroll-reveal";
import { PublicNavbar } from "@/features/public-site/public-navbar";
import {
  getPublicHomeHref,
  getPublicPrivacyHref,
  getPublicTermsHref,
  type PublicLocale,
} from "@/features/public-site/site-config";

type PublicLegalPageProps = {
  documentType: LegalDocumentType;
  locale: PublicLocale;
};

export const PublicLegalPage = ({ documentType, locale }: PublicLegalPageProps) => {
  const landingContent = getPublicLandingContent(locale);
  const documentContent = getLegalDocumentContent(locale, documentType);

  const homeHref = getPublicHomeHref(locale);
  const privacyHref = getPublicPrivacyHref(locale);
  const termsHref = getPublicTermsHref(locale);
  const localeSwitchHref =
    documentType === "privacy"
      ? getPublicPrivacyHref(locale === "fi" ? "en" : "fi")
      : getPublicTermsHref(locale === "fi" ? "en" : "fi");

  const navItems = [
    { href: homeHref, label: locale === "fi" ? "Etusivu" : "Home" },
    { href: privacyHref, label: locale === "fi" ? "Tietosuoja" : "Privacy" },
    { href: termsHref, label: locale === "fi" ? "Käyttöehdot" : "Terms" },
  ] as const;

  return (
    <main className="public-home public-home-v2 public-page-root public-legal-page">
      <ScrollRevealProvider />
      <PublicNavbar
        contactHref={landingContent.contactHref}
        contactLabel={landingContent.contactLabel}
        instagramHref={landingContent.interestHref}
        locale={locale}
        localeLabel={landingContent.localeLabel}
        localeSwitchHref={localeSwitchHref}
        localeSwitchLabel={landingContent.localeSwitchLabel}
        navItems={navItems}
      />

      <section className="public-shell public-page-hero public-page-hero-compact">
        <div className="public-page-hero-copy">
          <p className="eyebrow">
            {locale === "fi" ? "Yleinen tieto" : "Public information"}
          </p>
          <h1>{documentContent.title}</h1>
          <p className="public-page-lead">{documentContent.intro}</p>
        </div>
        <div className="public-page-meta-pill">
          <span>{locale === "fi" ? "Päivitetty" : "Last updated"}</span>
          <strong>{documentContent.updatedAt}</strong>
        </div>
      </section>

      <section className="public-shell public-page-grid-shell public-legal-shell-v2">
        <div className="public-legal-grid">
          {documentContent.sections.map((section) => (
            <article key={section.title} className="public-legal-card">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul className="public-legal-list">
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))}
        </div>

        <div className="public-legal-return">
          <Link className="button button-secondary" href={homeHref}>
            {locale === "fi" ? "Takaisin etusivulle" : "Back to home"}
          </Link>
        </div>
      </section>

      <PublicFooter content={landingContent} />
    </main>
  );
};
