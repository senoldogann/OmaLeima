import { ContactForm } from "@/features/public-site/contact-form";
import {
    getContactPageContent,
    getContactPageHref,
} from "@/features/public-site/contact-content";
import { getPublicLandingContent } from "@/features/public-site/content";
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

    const navItems = [
        { href: homeHref, label: locale === "fi" ? "Etusivu" : "Home" },
        { href: privacyHref, label: locale === "fi" ? "Tietosuoja" : "Privacy" },
        { href: termsHref, label: locale === "fi" ? "Käyttöehdot" : "Terms" },
    ] as const;

    return (
        <main className="public-home public-home-v2 public-contact-page">
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

            <section className="public-shell public-contact-hero">
                <p className="eyebrow">{content.eyebrow}</p>
                <h1>{content.title}</h1>
                <p className="public-contact-intro">{content.intro}</p>
                <p className="public-contact-description">{content.description}</p>

                <dl className="public-contact-meta">
                    <div>
                        <dt>{locale === "fi" ? "Sähköposti" : "Email"}</dt>
                        <dd>
                            <a href={`mailto:${publicCompanyInfo.email}`}>{publicCompanyInfo.email}</a>
                        </dd>
                    </div>
                    <div>
                        <dt>{locale === "fi" ? "Puhelin" : "Phone"}</dt>
                        <dd>
                            <a href={publicCompanyInfo.phoneHref}>{publicCompanyInfo.phone}</a>
                        </dd>
                    </div>
                    <div>
                        <dt>Instagram</dt>
                        <dd>
                            <a href={publicCompanyInfo.instagramUrl} rel="me noopener" target="_blank">
                                {publicCompanyInfo.instagramHandle}
                            </a>
                        </dd>
                    </div>
                </dl>
            </section>

            <section className="public-shell public-contact-form-shell">
                <ContactForm apiPath="/api/contact" content={content} locale={locale} />
            </section>

            <PublicFooter content={landingContent} />
        </main>
    );
};
