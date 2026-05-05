import Image from "next/image";
import Link from "next/link";

import { getPublicLandingContent, type PublicLocale } from "@/features/public-site/content";
import { PublicFooter } from "@/features/public-site/public-footer";
import { ContactIcon, InstagramIcon } from "@/features/public-site/public-icons";
import { PublicNavbar } from "@/features/public-site/public-navbar";

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
    alt: "OmaLeima app screen with stamp progress and reward state.",
    height: 1536,
    src: "/images/public/omaleima-scanner-closeup.png",
    width: 1024,
  },
} as const;

/* Foto-galeri bento ızgarası için görseller */
const galleryImages = [
  {
    alt: "Järjestäjä seuraa tapahtumaa OmaLeiman kautta.",
    className: "public-mosaic-item public-mosaic-wide",
    height: 941,
    imageClassName: "public-image-position-center",
    src: "/images/public/scene-organizer-operations.png",
    width: 1672,
  },
  {
    alt: "Opiskelija pitää tapahtuman hallussa: leimakortti puhelimessa.",
    className: "public-mosaic-item",
    height: 1254,
    imageClassName: "public-image-position-center",
    src: "/images/public/scene-event-in-hand.png",
    width: 1254,
  },
  {
    alt: "Opiskelijat näyttävät palkintoa ja puhelinta tapahtumaillassa.",
    className: "public-mosaic-item public-mosaic-wide",
    height: 941,
    imageClassName: "public-image-position-center",
    src: "/images/public/gen-students-group.png",
    width: 1672,
  },
  {
    alt: "QR-koodi skannataan nopeasti baaritiskillä.",
    className: "public-mosaic-item",
    height: 887,
    imageClassName: "public-image-position-center",
    src: "/images/public/omaleima-scan.png",
    width: 1774,
  },
  {
    alt: "Opiskelijavirta siirtyy klubille ja tapahtumailta jatkuu.",
    className: "public-mosaic-item",
    height: 941,
    imageClassName: "public-image-position-center",
    src: "/images/public/omaleima-night-flow.png",
    width: 1672,
  },
  {
    alt: "QR-skannaus tapahtuu nopeasti tiskilla.",
    className: "public-mosaic-item public-mosaic-portrait",
    height: 1254,
    imageClassName: "public-image-position-right",
    src: "/images/public/omaleima-venue-scan.png",
    width: 1254,
  },
] as const;

const eventDayPhotos = [
  {
    alt: "QR scan tapahtuman aikana.",
    caption: "QR check nopeasti",
    className: "public-scene-card public-scene-card-feature",
    height: 941,
    imageClassName: "public-image-position-right",
    src: "/images/public/scene-bar-qr-scan.png",
    width: 1672,
  },
  {
    alt: "Palkintohetki opiskelijoiden kanssa.",
    caption: "Palkinto aukeaa oikeassa hetkessä",
    className: "public-scene-card",
    height: 941,
    imageClassName: "public-image-position-center",
    src: "/images/public/scene-reward-haalarimerkki.png",
    width: 1672,
  },
  {
    alt: "Opiskelija nayttaa QR-koodia tiskilla seuraavaa leimaa varten.",
    caption: "Seuraava checkpoint löytyy heti",
    className: "public-scene-card",
    height: 1254,
    imageClassName: "public-image-position-right",
    src: "/images/public/scene-scan-counter-side.png",
    width: 1254,
  },
] as const;

export const PublicLandingPage = ({ locale }: PublicLandingPageProps) => {
  const content = getPublicLandingContent(locale);

  return (
    <main className="public-home public-home-v2">
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

      {/* Atmosfer foto-galerisi – bento grid */}
      <section
        aria-label={locale === "fi" ? "Tapahtumaillan tunnelma" : "Event night atmosphere"}
        className="public-shell public-mosaic-shell"
      >
        <div className="public-mosaic-header">
          <p className="eyebrow">
            {locale === "fi" ? "Approkulttuuri elää" : "Appro culture lives"}
          </p>
          <h2 className="public-mosaic-heading">
            {locale === "fi"
              ? "Leimat, haalarit ja yöt joita ei unohda."
              : "Leimas, haalarit and nights worth remembering."}
          </h2>
        </div>
        <div className="public-photo-mosaic">
          {galleryImages.map((img) => (
            <div
              key={img.src}
              className={`${img.className} public-image-surface public-media-soft`}
            >
              <Image
                alt={img.alt}
                className={`public-image public-image-cover ${img.imageClassName}`}
                height={img.height}
                loading="eager"
                sizes="(max-width: 600px) 100vw, (max-width: 980px) 50vw, 33vw"
                src={img.src}
                width={img.width}
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
            className="public-image public-image-cover public-image-position-right"
            height={featureImages.scan.height}
            loading="eager"
            sizes="(max-width: 980px) 100vw, 40vw"
            src={featureImages.scan.src}
            width={featureImages.scan.width}
          />
        </div>
      </section>

      {/* Foto-odakli ikinci galeri */}
      <section
        aria-label={locale === "fi" ? "Tapahtumapäivän hetket" : "Event day moments"}
        className="public-shell public-scene-shell"
      >
        <div className="public-scene-heading">
          <p className="eyebrow">{locale === "fi" ? "Tapahtumaillan hetket" : "Moments from the night"}</p>
          <h2 className="public-section-heading-title">
            {locale === "fi"
              ? "Opiskelija, skanneri ja järjestäjä samassa virrassa."
              : "Students, scanners, and organisers in the same flow."}
          </h2>
        </div>
        <div className="public-scene-grid" role="list">
          {eventDayPhotos.map((img) => (
            <article key={img.src} className={`${img.className} public-image-surface public-media-soft`} role="listitem">
              <Image
                alt={img.alt}
                className={`public-image public-image-cover ${img.imageClassName}`}
                height={img.height}
                loading="eager"
                sizes="(max-width: 980px) 100vw, 50vw"
                src={img.src}
                width={img.width}
              />
              <span className="public-scene-caption">{img.caption}</span>
            </article>
          ))}
        </div>
      </section>

      {/* Nasıl çalışır – zaman çizelgesi */}
      <section className="public-shell public-timeline-shell" id="flow">
        <div className="public-section-heading">
          <p className="eyebrow">Flow</p>
          <h2>{locale === "fi" ? "Miten OmaLeima toimii" : "How OmaLeima works"}</h2>
        </div>

        <div className="public-timeline">
          {content.timelineItems.map((item) => (
            <article key={item.step} className="public-timeline-card">
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-shell public-growth-shell" id="model">
        <div className="public-growth-heading">
          <p className="eyebrow">{locale === "fi" ? "Pilottimalli" : "Pilot model"}</p>
          <h2>{content.growthModelTitle}</h2>
          <p>{content.growthModelSubtitle}</p>
        </div>

        <div className="public-growth-grid">
          {content.growthModelItems.map((item) => (
            <article key={item.eyebrow} className="public-growth-card">
              <span>{item.eyebrow}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <p className="public-growth-footnote">{content.growthModelFootnote}</p>
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
