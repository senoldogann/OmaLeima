import Image from "next/image";
import Link from "next/link";

import { getPublicLandingContent, type PublicLocale } from "@/features/public-site/content";
import { AnimatedFAQGrid } from "@/features/public-site/motion/AnimatedFAQGrid";
import { AnimatedGalleryGrid } from "@/features/public-site/motion/AnimatedGalleryGrid";
import { AnimatedHeroContent } from "@/features/public-site/motion/AnimatedHeroContent";
import { AnimatedHeroMedia } from "@/features/public-site/motion/AnimatedHeroMedia";
import { AnimatedSectionHeading } from "@/features/public-site/motion/AnimatedSectionHeading";
import { AnimatedStepsGrid } from "@/features/public-site/motion/AnimatedStepsGrid";
import { FloatingOrbs } from "@/features/public-site/motion/FloatingOrbs";
import { PublicFooter } from "@/features/public-site/public-footer";
import {
  ContactIcon,
  ShieldCheckIcon,
  UsersIcon,
  ZapIcon,
} from "@/features/public-site/public-icons";
import { PublicNavbar } from "@/features/public-site/public-navbar";
import { ScrollRevealProvider } from "@/features/public-site/scroll-reveal";

type PublicLandingPageProps = {
  locale: PublicLocale;
};

const featureImages = {
  hero: {
    alt: "Students celebrating at a Finnish student event night with lime and teal lighting.",
    height: 1024,
    src: "/images/public/scene-hero-appro-night-v2.png",
    width: 1536,
  },
  operations: {
    alt: "QR scanning at the venue counter during a student event night.",
    height: 941,
    src: "/images/public/scene-scan-counter-side.png",
    width: 1672,
  },
  pocket: {
    alt: "OmaLeima mobile app in hand during an event night.",
    height: 941,
    src: "/images/public/scene-leimat-mukana-hd.png",
    width: 1672,
  },
} as const;

const galleryImages = [
  {
    alt: "Yksi scan. Leima heti. – OmaLeima QR-skannaus baarissa.",
    src: "/images/public/scene-promo-bar-scan.png",
  },
  {
    alt: "Leimat mukana. Ilta vasta alkaa. – Opiskelijat OmaLeima-sovelluksen kanssa.",
    src: "/images/public/scene-promo-leimat-mukana.png",
  },
  {
    alt: "Leimat kasaan. Palkinto auki. – Opiskelijat juhlivat palkintoa.",
    src: "/images/public/scene-promo-palkinto-auki.png",
  },
  {
    alt: "Koko ilta samassa sovelluksessa. – Opiskelijaryhmä appro-illalla.",
    src: "/images/public/scene-promo-koko-ilta.png",
  },
] as const;

const proofIcons = [ZapIcon, ShieldCheckIcon, UsersIcon] as const;
const supportIcons = [UsersIcon, ZapIcon, ShieldCheckIcon, ZapIcon] as const;

export const PublicLandingPage = ({ locale }: PublicLandingPageProps) => {
  const content = getPublicLandingContent(locale);

  return (
    <main className="public-home public-home-v2 public-home-v3" id="top">
      <ScrollRevealProvider />
      <PublicNavbar
        contactHref={content.contactHref}
        contactLabel={content.contactLabel}
        instagramHref={content.interestHref}
        locale={locale}
        localeLabel={content.localeLabel}
        localeSwitchHref={content.localeSwitchHref}
        localeSwitchLabel={content.localeSwitchLabel}
        navItems={content.navItems}
      />

      <section aria-labelledby="public-title" className="public-shell public-poster-hero" style={{ position: "relative" }}>
        <FloatingOrbs />
        <div className="public-poster-grid" style={{ position: "relative", zIndex: 1 }}>
          <AnimatedHeroContent
            applyHref={content.applyHref}
            applyLabel={content.applyLabel}
            contactHref={content.contactHref}
            contactLabel={content.contactLabel}
            description={content.description}
            eyebrow={content.eyebrow}
            heroTitle={content.heroTitle}
            sectionLabel={content.sectionLabel}
            statItems={content.statItems}
          />

          <AnimatedHeroMedia
            alt={featureImages.hero.alt}
            height={featureImages.hero.height}
            src={featureImages.hero.src}
            width={featureImages.hero.width}
          />
        </div>
      </section>

      <section className="public-shell public-steps-shell" id="flow">
        <AnimatedSectionHeading className="public-section-heading public-section-heading-compact">
          <p className="eyebrow">{locale === "fi" ? "Kolme vaihetta" : "Three steps"}</p>
          <h2>{locale === "fi" ? "Miten OmaLeima toimii" : "How OmaLeima works"}</h2>
        </AnimatedSectionHeading>

        <AnimatedStepsGrid items={content.timelineItems} />
      </section>

      <section className="public-shell public-spotlight-shell" id="culture">
        <div className="public-spotlight-media public-image-surface public-media-soft">
          <Image
            alt={featureImages.pocket.alt}
            className="public-image public-image-cover public-image-position-center"
            height={featureImages.pocket.height}
            loading="eager"
            quality={92}
            sizes="(max-width: 980px) 100vw, 46vw"
            src={featureImages.pocket.src}
            width={featureImages.pocket.width}
          />
        </div>

        <div className="public-spotlight-copy">
          <p className="eyebrow">{locale === "fi" ? "Leimat mukana" : "Leimas in your pocket"}</p>
          <h2>
            {locale === "fi"
              ? "Ei paperipassia. Ei turhaa säätöä."
              : "No paper pass. No loose event-day chaos."}
          </h2>
          <p className="public-spotlight-description">{content.productTitle}</p>

          <div className="public-point-list">
            {content.storyItems.map((item, index) => {
              const ProofIcon = proofIcons[index as 0 | 1 | 2];

              return (
                <article key={item.title} className="public-point-row">
                  <ProofIcon className="public-card-icon" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="public-actions">
            <Link className="button button-primary" href={content.contactHref}>
              <ContactIcon className="public-inline-icon" />
              {content.contactLabel}
            </Link>
          </div>
        </div>
      </section>

      <section className="public-shell public-proof-shell" id="event-day">
        <div className="public-proof-copy">
          <p className="eyebrow">{locale === "fi" ? "Rakennettu tapahtumapäivään" : "Built for event day"}</p>
          <h2>
            {locale === "fi"
              ? "Appro, QR-skannaus ja palkinnot sujuvasti samassa järjestelmässä."
              : "Appro flow, QR scanning, and rewards in one calm system."}
          </h2>
          <p className="public-proof-description">
            {locale === "fi"
              ? "Opiskelija näkee etenemisen, ravintola skannaa nopeasti ja järjestäjä pysyy tilanteen tasalla ilman paperikortteja."
              : "Students see progress, venues scan quickly, and organizers stay on top of the night without paper cards."}
          </p>

          <div className="public-point-list">
            {content.supportItems.map((item, index) => {
              const SupportIcon = supportIcons[index as 0 | 1 | 2 | 3];

              return (
                <article key={item.title} className="public-point-row">
                  <SupportIcon className="public-card-icon" />
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="public-proof-media public-image-surface public-media-soft">
          <Image
            alt={featureImages.operations.alt}
            className="public-image public-image-cover public-image-position-center"
            height={featureImages.operations.height}
            loading="eager"
            quality={92}
            sizes="(max-width: 980px) 100vw, 42vw"
            src={featureImages.operations.src}
            width={featureImages.operations.width}
          />
        </div>
      </section>

      <section aria-label={locale === "fi" ? "Appro-illan tunnelma" : "Appro night experience"} className="public-shell public-gallery-shell" data-scroll-reveal>
        <AnimatedSectionHeading className="public-gallery-head" delay={0.1}>
          <p className="eyebrow">{locale === "fi" ? "Hetket tallessa" : "Moments captured"}</p>
          <h2>{locale === "fi" ? "Tältä appro-ilta näyttää" : "This is what an appro night looks like"}</h2>
        </AnimatedSectionHeading>
        <AnimatedGalleryGrid images={galleryImages} />
      </section>

      <section className="public-shell public-faq-shell" id="faq">
        <AnimatedSectionHeading className="public-section-heading public-section-heading-compact">
          <p className="eyebrow">{locale === "fi" ? "Usein kysyttyä" : "FAQ"}</p>
          <h2>{locale === "fi" ? "Vastaukset yleisimpiin kysymyksiin" : "Common questions, answered"}</h2>
        </AnimatedSectionHeading>
        <AnimatedFAQGrid items={content.faqItems} />
      </section>

      <section className="public-shell public-final-cta" id="contact">
        <div className="public-final-cta-copy">
          <p className="eyebrow">{locale === "fi" ? "Hae mukaan" : "Join the pilot"}</p>
          <h2>
            {locale === "fi"
              ? "Pilotoi OmaLeimaa klubin, tapahtuman tai yritysillan kanssa."
              : "Pilot OmaLeima with a club, event, or venue partner."}
          </h2>
          <p>
            {locale === "fi"
              ? "Aloitetaan yksinkertaisesti: kerro tapahtumastasi tai paikastasi, niin suunnitellaan sopiva käyttöönotto."
              : "Start simple: tell us about your event or venue, and we will plan the right rollout together."}
          </p>
        </div>

        <div className="public-actions public-actions-end">
          <Link className="button button-primary" href={content.applyHref}>
            {content.applyLabel}
          </Link>
          <Link className="button button-secondary" href={content.contactHref}>
            <ContactIcon className="public-inline-icon" />
            {content.contactLabel}
          </Link>
        </div>
      </section>

      <PublicFooter content={content} />
    </main>
  );
};
