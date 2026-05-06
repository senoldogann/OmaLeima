import { BusinessApplicationForm } from "@/features/public-site/business-application-form";
import {
  getBusinessApplicationContent,
  getBusinessApplicationHref,
} from "@/features/public-site/business-application-content";
import { getPublicLandingContent } from "@/features/public-site/content";
import {
  BuildingIcon,
  ContactIcon,
  MapPinIcon,
} from "@/features/public-site/public-icons";
import { PublicFooter } from "@/features/public-site/public-footer";
import { PublicNavbar } from "@/features/public-site/public-navbar";
import { ScrollRevealProvider } from "@/features/public-site/scroll-reveal";
import {
  getPublicHomeHref,
  getPublicPrivacyHref,
  getPublicTermsHref,
  publicCompanyInfo,
  type PublicLocale,
} from "@/features/public-site/site-config";

type BusinessApplicationPageProps = {
  locale: PublicLocale;
};

export const BusinessApplicationPage = ({ locale }: BusinessApplicationPageProps) => {
  const landingContent = getPublicLandingContent(locale);
  const content = getBusinessApplicationContent(locale);
  const homeHref = getPublicHomeHref(locale);
  const privacyHref = getPublicPrivacyHref(locale);
  const termsHref = getPublicTermsHref(locale);
  const localeSwitchHref = getBusinessApplicationHref(locale === "fi" ? "en" : "fi");
  const isProtectionRequired =
    process.env.VERCEL === "1" || process.env.REQUIRE_CONTACT_TURNSTILE === "1";
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null;

  const navItems = [
    { href: homeHref, label: locale === "fi" ? "Etusivu" : "Home" },
    { href: privacyHref, label: locale === "fi" ? "Tietosuoja" : "Privacy" },
    { href: termsHref, label: locale === "fi" ? "Käyttöehdot" : "Terms" },
  ] as const;

  return (
    <main className="public-home public-home-v2 public-page-root">
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

      <section className="public-shell public-page-hero">
        <div className="public-page-hero-copy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <p className="public-page-lead">{content.description}</p>
        </div>
      </section>

      <section className="public-shell public-page-grid-shell">
        <div className="public-page-grid">
          <aside className="public-page-aside">
            <article className="public-page-note-card">
              <BuildingIcon className="public-card-icon" />
              <div>
                <h2>{locale === "fi" ? "Admin-polku" : "Admin flow"}</h2>
                <p>
                  {locale === "fi"
                    ? "Hakemus, hyväksyntä ja yritysprofiili hoidetaan samassa virrassa."
                    : "Application, approval, and business profile setup happen in one flow."}
                </p>
              </div>
            </article>
            <article className="public-page-note-card">
              <MapPinIcon className="public-card-icon" />
              <div>
                <h2>{locale === "fi" ? "Scannerit" : "Scanners"}</h2>
                <p>
                  {locale === "fi"
                    ? "Tunnukset ja käyttöönotto toimitetaan hyväksynnän jälkeen."
                    : "Scanner access and onboarding are delivered after approval."}
                </p>
              </div>
            </article>
            <article className="public-page-note-card">
              <ContactIcon className="public-card-icon" />
              <div>
                <h2>{locale === "fi" ? "Yhteys" : "Contact"}</h2>
                <p>
                  <a href={`mailto:${publicCompanyInfo.email}`}>{publicCompanyInfo.email}</a>
                </p>
              </div>
            </article>
          </aside>

          <div className="public-page-form-panel">
            <BusinessApplicationForm
              apiPath="/api/business-applications"
              content={content}
              isProtectionRequired={isProtectionRequired}
              turnstileSiteKey={turnstileSiteKey}
            />
          </div>
        </div>
      </section>

      <PublicFooter content={landingContent} />
    </main>
  );
};
