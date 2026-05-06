import Image from "next/image";
import Link from "next/link";

import { getPublicLandingContent, type PublicLocale } from "@/features/public-site/content";
import { PublicFooter } from "@/features/public-site/public-footer";
import {
  ContactIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  StarIcon,
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

const timelineCardImages = [
  "/images/public/gen-students-group.png",
  "/images/public/gen-scanning-qr.png",
  "/images/public/gen-reward-moment.png",
] as const;

const stepIcons = [UsersIcon, QrCodeIcon, StarIcon] as const;
const proofIcons = [ZapIcon, ShieldCheckIcon, UsersIcon] as const;
const supportIcons = [UsersIcon, StarIcon, ShieldCheckIcon, ZapIcon] as const;

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

      <section aria-labelledby="public-title" className="public-shell public-poster-hero">
        <div className="public-poster-grid">
          <div className="public-poster-copy">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="public-title">{content.heroTitle}</h1>
            <p className="public-poster-description">{content.description}</p>

            <div className="public-actions">
              <Link className="button button-primary" href={content.applyHref}>
                {content.applyLabel}
              </Link>
              <Link className="button button-secondary" href={content.contactHref}>
                <ContactIcon className="public-inline-icon" />
                {content.contactLabel}
              </Link>
            </div>

            <div aria-label={content.sectionLabel} className="public-poster-stat-row">
              {content.statItems.map((item) => (
                <article key={item.label} className="public-poster-stat">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="public-poster-media public-image-surface">
            <Image
              alt={featureImages.hero.alt}
              className="public-image public-image-cover public-image-position-center"
              height={featureImages.hero.height}
              priority
              quality={92}
              sizes="(max-width: 980px) 100vw, 56vw"
              src={featureImages.hero.src}
              width={featureImages.hero.width}
            />
          </div>
        </div>
      </section>

      <section className="public-shell public-steps-shell" id="flow">
        <div className="public-section-heading public-section-heading-compact">
          <p className="eyebrow">{locale === "fi" ? "Kolme vaihetta" : "Three steps"}</p>
          <h2>{locale === "fi" ? "Miten OmaLeima toimii" : "How OmaLeima works"}</h2>
        </div>

        <div className="public-step-grid">
          {content.timelineItems.map((item, index) => {
            const StepIcon = stepIcons[index as 0 | 1 | 2];

            return (
              <article key={item.step} className="public-step-card">
                <div className="public-step-image-wrap">
                  <Image
                    alt=""
                    aria-hidden="true"
                    className="public-image public-image-cover public-image-position-center"
                    fill
                    sizes="(max-width: 980px) 100vw, 33vw"
                    src={timelineCardImages[index as 0 | 1 | 2]}
                  />
                </div>
                <div className="public-step-copy">
                  <div className="public-step-topline">
                    <span className="public-step-number">{item.step}</span>
                    <StepIcon className="public-card-icon" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section aria-label={locale === "fi" ? "Appro-illan tunnelma" : "Appro night experience"} className="public-shell public-gallery-shell">
        <div className="public-gallery-head">
          <p className="eyebrow">{locale === "fi" ? "Hetket tallessa" : "Moments captured"}</p>
          <h2>{locale === "fi" ? "Tältä appro-ilta näyttää" : "This is what an appro night looks like"}</h2>
        </div>
        <div className="public-gallery-grid">
          {galleryImages.map((img) => (
            <div key={img.src} className="public-gallery-item">
              <Image
                alt={img.alt}
                className="public-image public-image-cover public-image-position-center"
                fill
                sizes="(max-width: 640px) calc(50vw - 28px), (max-width: 980px) calc(50vw - 36px), calc(25vw - 24px)"
                src={img.src}
              />
            </div>
          ))}
        </div>
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
