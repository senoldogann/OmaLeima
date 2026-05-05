import Image from "next/image";
import Link from "next/link";

import { getPublicLandingContent, type PublicLocale } from "@/features/public-site/content";
import { PublicFooter } from "@/features/public-site/public-footer";
import { ContactIcon, InstagramIcon } from "@/features/public-site/public-icons";
import { PublicNavbar } from "@/features/public-site/public-navbar";
import { ScrollRevealProvider } from "@/features/public-site/scroll-reveal";

type PublicLandingPageProps = {
  locale: PublicLocale;
};

/* Ana hero ve bölüm görselleri */
const featureImages = {
  hero: {
    alt: "Opiskelija haalarissa näyttää QR-koodia baaritiskillä – Yksi scan, leima heti.",
    height: 1254,
    src: "/images/public/scene-haalarit-hero.png",
    width: 1672,
  },
  lines: {
    alt: "Abstract OmaLeima lime line texture on a dark background.",
    height: 1844,
    src: "/images/public/omaleima-lime-lines.png",
    width: 853,
  },
  reward: {
    alt: "Opiskelija näyttää avattua palkintoa ja puhelinta tapahtumaillassa.",
    height: 1024,
    src: "/images/public/omaleima-reward.png",
    width: 1536,
  },
  scan: {
    alt: "Järjestäjä seuraa tapahtumaa OmaLeiman kautta – yksi selkeä hallintapinta.",
    height: 941,
    src: "/images/public/scene-organizer-hd.png",
    width: 1672,
  },
} as const;

/* Flow adımları için arka plan fotoğrafları – her karta özgü */
const timelineCardImages = [
  "/images/public/gen-scanning-qr.png",
  "/images/public/omaleima-scan.png",
  "/images/public/omaleima-student-reward.png",
] as const;

/* Pilottimalli kartları için arka plan fotoğrafları – her karta özgü */
const growthCardImages = [
  "/images/public/gen-app-screen.png",
  "/images/public/omaleima-organizer-operations.png",
  "/images/public/omaleima-night-flow.png",
] as const;

/* Atmosfer galerisi – 8 benzersiz fotoğraf, bento ızgara düzeni */
const scenePhotos = [
  {
    alt: "QR-skannaus baaritiskillä – yhdellä näytöllä leima kirjautuu.",
    span: "wide" as const,
    height: 887,
    src: "/images/public/omaleima-venue-scan.png",
    width: 1774,
  },
  {
    alt: "Opiskelijat tapahtumassa – tunnelma tiivistyy.",
    span: "normal" as const,
    height: 1254,
    src: "/images/public/gen-student-event.png",
    width: 1254,
  },
  {
    alt: "Opiskelija katselee appro-tapahtumaansa puhelimesta.",
    span: "normal" as const,
    height: 1254,
    src: "/images/public/gen-student-scene.png",
    width: 1254,
  },
  {
    alt: "Palkinto aukeaa – haalarimerkki lunastetaan tapahtumassa.",
    span: "wide" as const,
    height: 941,
    src: "/images/public/gen-reward-moment.png",
    width: 1672,
  },
  {
    alt: "Opiskelijaryhmä pitää QR-koodia pystyssä yöllisellä kadulla.",
    span: "wide" as const,
    height: 941,
    src: "/images/public/gen-students-group.png",
    width: 1672,
  },
  {
    alt: "OmaLeima-sovellus reaaliaikainen käyttöliittymä.",
    span: "normal" as const,
    height: 1619,
    src: "/images/public/gen-venue-interior.png",
    width: 971,
  },
  {
    alt: "Opiskelijat käyttävät OmaLeimaa puhelimella ja kannettavalla.",
    span: "normal" as const,
    height: 1568,
    src: "/images/public/gen-app-mockup.png",
    width: 1003,
  },
  {
    alt: "QR-skannausasema baarissa – leima rekisteröityy heti.",
    span: "wide" as const,
    height: 941,
    src: "/images/public/omaleima-bar-qr-scan.png",
    width: 1672,
  },
] as const;

export const PublicLandingPage = ({ locale }: PublicLandingPageProps) => {
  const content = getPublicLandingContent(locale);

  return (
    <main className="public-home public-home-v2">
      <ScrollRevealProvider />
      <PublicNavbar
        contactHref={content.contactHref}
        contactLabel={content.contactLabel}
        locale={locale}
        localeLabel={content.localeLabel}
        localeSwitchHref={content.localeSwitchHref}
        localeSwitchLabel={content.localeSwitchLabel}
        navItems={content.navItems}
      />

      {/* Hero bölümü – iki sütunlu düzen */}
      <section aria-labelledby="public-title" className="public-shell public-hero-v2">
        <div className="public-hero-grid">
          <div className="public-copy public-copy-v2">
            <p className="eyebrow">{content.eyebrow}</p>
            <h1 id="public-title">{content.heroTitle}</h1>
            <p className="public-hero-desc">{content.description}</p>

            <div className="public-actions">
              <Link className="button button-primary" href={content.contactHref}>
                <ContactIcon className="public-inline-icon" />
                {content.contactLabel}
              </Link>
              <Link className="button button-ghost" href={content.interestHref}>
                <InstagramIcon className="public-inline-icon" />
                {content.interestLabel}
              </Link>
            </div>

            <div aria-label={content.sectionLabel} className="public-stat-row">
              {content.statItems.map((item) => (
                <article key={item.label} className="public-stat-card">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </article>
              ))}
            </div>
          </div>

          <div className="public-hero-media">
            <div aria-hidden="true" className="public-hero-glow" />
            <Image
              alt={featureImages.hero.alt}
              className="public-image public-image-cover"
              height={featureImages.hero.height}
              priority
              sizes="(max-width: 980px) 100vw, 48vw"
              src={featureImages.hero.src}
              width={featureImages.hero.width}
            />
          </div>
        </div>
      </section>

      {/* Atmosfer foto-galerisi – tüm HD sahne fotoğrafları */}
      <section
        aria-label={locale === "fi" ? "Tapahtumaillan tunnelma" : "Event night atmosphere"}
        className="public-shell public-gallery-shell"
      >
        <div className="public-gallery-header">
          <p className="eyebrow">
            {locale === "fi" ? "Approkulttuuri elää" : "Appro culture lives"}
          </p>
          <h2 className="public-gallery-heading">
            {locale === "fi"
              ? "Leimat, haalarit ja yöt joita ei unohda."
              : "Leimas, haalarit and nights worth remembering."}
          </h2>
        </div>
        <div className="public-gallery-grid">
          {scenePhotos.map((photo) => (
            <div
              key={photo.src}
              className={`public-gallery-item public-image-surface public-media-soft${photo.span === "wide" ? " public-gallery-wide" : ""}`}
            >
              <Image
                alt={photo.alt}
                className="public-image public-image-cover public-image-position-center"
                height={photo.height}
                loading="eager"
                sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw"
                src={photo.src}
                width={photo.width}
              />
            </div>
          ))}
        </div>
      </section>

      {/* Kültür bölümü – hikaye kartları + görsel */}
      <section
        aria-label={content.sectionLabel}
        className="public-shell public-story-grid"
        id="culture"
      >
        <div className="public-stack">
          <p className="eyebrow">{content.sectionLabel}</p>
          <h2 className="public-lead-heading">{content.productTitle}</h2>
          {content.storyItems.map((item) => (
            <article key={item.title} className="public-story-card public-story-card-highlight">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="public-image-card public-image-card-scan public-image-surface public-media-soft">
          <Image
            alt={featureImages.scan.alt}
            className="public-image public-image-cover public-image-position-center"
            height={featureImages.scan.height}
            loading="eager"
            sizes="(max-width: 980px) 100vw, 40vw"
            src={featureImages.scan.src}
            width={featureImages.scan.width}
          />
        </div>
      </section>

      {/* Nasıl çalışır + Pilottimalli – birleşik bölüm */}
      <section className="public-shell public-combined-section" id="flow">
        {/* Adım akışı */}
        <div className="public-combined-flow">
          <div className="public-section-heading">
            <p className="eyebrow">Flow</p>
            <h2>{locale === "fi" ? "Miten OmaLeima toimii" : "How OmaLeima works"}</h2>
          </div>

          <div className="public-timeline">
            {content.timelineItems.map((item, idx) => (
              <article key={item.step} className="public-timeline-card">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="public-timeline-card-bg"
                  fill
                  sizes="(max-width: 980px) 100vw, 33vw"
                  src={timelineCardImages[idx as 0 | 1 | 2]}
                />
                <div aria-hidden="true" className="public-timeline-card-overlay" />
                <div className="public-timeline-card-content">
                  <span>{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Bölüm ayıraç çizgisi */}
        <div className="public-combined-divider" aria-hidden="true" />

        {/* Pilottimalli */}
        <div className="public-combined-growth" id="model">
          <div className="public-growth-heading">
            <p className="eyebrow">{locale === "fi" ? "Pilottimalli" : "Pilot model"}</p>
            <h2>{content.growthModelTitle}</h2>
            <p>{content.growthModelSubtitle}</p>
          </div>

          <div className="public-growth-grid">
            {content.growthModelItems.map((item, idx) => (
              <article key={item.eyebrow} className="public-growth-card">
                <Image
                  alt=""
                  aria-hidden="true"
                  className="public-growth-card-bg"
                  fill
                  sizes="(max-width: 980px) 100vw, 33vw"
                  src={growthCardImages[idx as 0 | 1 | 2]}
                />
                <div aria-hidden="true" className="public-growth-card-overlay" />
                <div className="public-growth-card-content">
                  <span>{item.eyebrow}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="public-growth-footnote">{content.growthModelFootnote}</p>
        </div>
      </section>

      {/* Etkinlik günü bölümü – ödül görseli + destek kartları */}
      <section className="public-shell public-support-grid" id="event-day">
        <div className="public-image-card public-image-card-reward public-image-surface public-media-soft">
          <Image
            alt={featureImages.reward.alt}
            className="public-image public-image-cover public-image-position-center"
            height={featureImages.reward.height}
            loading="eager"
            sizes="(max-width: 980px) 100vw, 42vw"
            src={featureImages.reward.src}
            width={featureImages.reward.width}
          />
        </div>

        <div className="public-stack">
          <div className="public-section-heading">
            <p className="eyebrow">
              {locale === "fi" ? "Valmis tapahtumapäivään" : "Ready for event day"}
            </p>
            <h2>
              {locale === "fi"
                ? "Rakennettu approihin, haalarimerkkeihin ja oikeaan opiskelijavirtaan."
                : "Built for appro nights, reward thresholds, and real student movement."}
            </h2>
          </div>

          {content.supportItems.map((item) => (
            <article key={item.title} className="public-story-card public-story-card-soft public-support-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}

          <div className="public-contact-card public-support-contact-card" id="contact">
            <Image
              alt=""
              className="public-contact-texture"
              height={featureImages.lines.height}
              src={featureImages.lines.src}
              width={featureImages.lines.width}
            />
            <h3>
              {locale === "fi"
                ? "Kiinnostuitko pilotista tai klubikäytöstä?"
                : "Interested in a pilot or club rollout?"}
            </h3>
            <p>
              {locale === "fi"
                ? "Ota yhteyttä, jos haluat pilotoida OmaLeimaa approssa, opiskelijajärjestössä tai yritysyhteistyössä."
                : "Get in touch if you want to pilot OmaLeima in an appro, student organisation, or partner venue flow."}
            </p>
            <div className="public-actions">
              <Link className="button button-primary" href={content.contactHref}>
                <ContactIcon className="public-inline-icon" />
                {content.contactLabel}
              </Link>
              <Link className="button button-secondary" href={content.interestHref}>
                <InstagramIcon className="public-inline-icon" />
                {content.interestLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter content={content} />
    </main>
  );
};
