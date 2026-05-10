import Link from "next/link";

import { getCookieConsentCopy } from "@/features/privacy/cookie-consent";
import { CookieSettingsButton } from "@/features/privacy/cookie-settings-button";
import type { PublicLandingContent } from "@/features/public-site/content";
import {
  BuildingIcon,
  ContactIcon,
  InstagramIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/features/public-site/public-icons";
import { publicCompanyInfo } from "@/features/public-site/site-config";

type PublicFooterProps = {
  content: PublicLandingContent;
};

export const PublicFooter = ({ content }: PublicFooterProps) => {
  const locale = content.localeLabel === "FI" ? "fi" : "en";
  const cookieCopy = getCookieConsentCopy(locale);

  return (
    <footer className="public-footer-band">
      <div className="public-footer-inner">
        <div className="public-footer-main">
          <div className="public-footer-brand-column">
            <span className="public-footer-kicker">{content.footerCompanyLabel}</span>
            <h2>OmaLeima</h2>
            <p>{content.footerNote}</p>
          </div>

          <div className="public-footer-column">
            <span className="public-footer-label">{content.footerCompanyLabel}</span>
            <div className="public-footer-info-list">
              <div className="public-footer-info-item">
                <BuildingIcon className="public-inline-icon" />
                <div>
                  <strong>{publicCompanyInfo.name}</strong>
                  <span>
                    {content.footerBusinessIdLabel}: {publicCompanyInfo.businessId}
                  </span>
                </div>
              </div>
              <div className="public-footer-info-item">
                <MapPinIcon className="public-inline-icon" />
                <div>
                  <strong>{content.footerAddressLabel}</strong>
                  <span>{publicCompanyInfo.address}</span>
                </div>
              </div>
              <div className="public-footer-info-item">
                <MapPinIcon className="public-inline-icon" />
                <div>
                  <strong>{content.footerPostalLabel}</strong>
                  <span>{publicCompanyInfo.mailingAddress}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="public-footer-column">
            <span className="public-footer-label">
              {content.localeLabel === "FI" ? "Yhteys" : "Contact"}
            </span>
            <div className="public-footer-info-list">
              <Link className="public-footer-link-row" href={content.contactHref}>
                <ContactIcon className="public-inline-icon" />
                <span>{publicCompanyInfo.email}</span>
              </Link>
              <Link className="public-footer-link-row" href={publicCompanyInfo.phoneHref}>
                <PhoneIcon className="public-inline-icon" />
                <span>
                  {content.footerPhoneLabel}: {publicCompanyInfo.phone}
                </span>
              </Link>
              <Link className="public-footer-link-row" href={content.interestHref}>
                <InstagramIcon className="public-inline-icon" />
                <span>{publicCompanyInfo.instagramHandle}</span>
              </Link>
            </div>
          </div>

          <div className="public-footer-column">
            <span className="public-footer-label">{content.footerLegalLabel}</span>
            <div className="public-footer-legal-list">
              {content.footerLegalItems.map((item) => (
                <Link key={item.href} className="public-footer-chip" href={item.href}>
                  {item.label}
                </Link>
              ))}
              <CookieSettingsButton label={cookieCopy.footerSettingsLabel} />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
