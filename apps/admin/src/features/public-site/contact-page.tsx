import Image from "next/image";
import { ContactForm } from "@/features/public-site/contact-form";
import {
  getContactPageContent,
  getContactPageHref,
} from "@/features/public-site/contact-content";
import { getPublicLandingContent } from "@/features/public-site/content";
import {
  ContactIcon,
  InstagramIcon,
  PhoneIcon,
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

type PublicContactPageProps = {
  locale: PublicLocale;
};

export const PublicContactPage = ({ locale }: PublicContactPageProps) => {
  const landingContent = getPublicLandingContent(locale);
  const content = getContactPageContent(locale);

  const homeHref = getPublicHomeHref(locale);
  const privacyHref = getPublicPrivacyHref(locale);
  const termsHref = getPublicTermsHref(locale);
  const localeSwitchHref = getContactPageHref(locale === "fi" ? "en" : "fi");
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
        contactHref={getContactPageHref(locale)}
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
          <p className="public-page-lead">{content.intro}</p>
          <p className="public-page-body">{content.description}</p>
        </div>
      </section>

      <section className="public-shell public-page-grid-shell">
        <div className="public-page-grid">
          <aside className="public-page-aside">
            <article className="public-page-note-card">
              <ContactIcon className="public-card-icon" />
              <div>
                <h2>{locale === "fi" ? "Sähköposti" : "Email"}</h2>
                <p>
                  <a href={`mailto:${publicCompanyInfo.email}`}>{publicCompanyInfo.email}</a>
                </p>
              </div>
            </article>
            <article className="public-page-note-card">
              <PhoneIcon className="public-card-icon" />
              <div>
                <h2>{locale === "fi" ? "Puhelin" : "Phone"}</h2>
                <p>
                  <a href={publicCompanyInfo.phoneHref}>{publicCompanyInfo.phone}</a>
                </p>
              </div>
            </article>
            <article className="public-page-note-card">
              <InstagramIcon className="public-card-icon" />
              <div>
                <h2>Instagram</h2>
                <p>
                  <a href={publicCompanyInfo.instagramUrl} rel="me noopener" target="_blank">
                    {publicCompanyInfo.instagramHandle}
                  </a>
                </p>
              </div>
            </article>

            <div className="public-page-aside-visual">
              <Image
                alt={locale === "fi" ? "Otetaan yhteyttä" : "Get in touch"}
                className="public-page-aside-img"
                height={480}
                src="/images/public/hero-contact-ota-yhteytta.png"
                width={480}
              />
            </div>
          </aside>

          <div className="public-page-form-panel">
            <ContactForm
              apiPath="/api/contact"
              content={content}
              isProtectionRequired={isProtectionRequired}
              locale={locale}
              turnstileSiteKey={turnstileSiteKey}
            />
          </div>
        </div>
      </section>

      <PublicFooter content={landingContent} />
    </main>
  );
};
