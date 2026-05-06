"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { PublicLandingContent, PublicLocale } from "@/features/public-site/content";
import { CloseIcon, ContactIcon, InstagramIcon, LanguageIcon, MenuIcon } from "@/features/public-site/public-icons";
import { getPublicHomeHref } from "@/features/public-site/site-config";

type PublicNavbarProps = {
  contactHref: string;
  contactLabel: string;
  instagramHref: string;
  locale: PublicLocale;
  localeLabel: string;
  localeSwitchHref: string;
  localeSwitchLabel: string;
  navItems: PublicLandingContent["navItems"];
};

const mobileMenuBreakpoint = 640;

export const PublicNavbar = ({
  contactHref,
  contactLabel,
  instagramHref,
  locale,
  localeLabel,
  localeSwitchHref,
  localeSwitchLabel,
  navItems,
}: PublicNavbarProps) => {
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const homeHref = getPublicHomeHref(locale);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > mobileMenuBreakpoint) {
        setIsMenuOpen(false);
      }
    };

    const handleScroll = () => {
      setHasScrolled(window.scrollY > 24);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    handleResize();
    handleScroll();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleMenuToggle = () => {
    setIsMenuOpen((currentValue) => !currentValue);
  };

  const handleMenuClose = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <div aria-hidden="true" className="public-navbar-spacer" />
      <div className="public-navbar-wrap">
        <nav
          aria-label={locale === "fi" ? "Paanavigaatio" : "Main navigation"}
          className="public-navbar"
          data-open={isMenuOpen ? "true" : "false"}
        >
          <div
            className="public-navbar-inner"
            data-open={isMenuOpen ? "true" : "false"}
            data-scrolled={hasScrolled ? "true" : "false"}
          >
            <div className="public-brand-row">
              <Link
                aria-label={locale === "fi" ? "Palaa etusivulle" : "Go to homepage"}
                className="public-brand"
                href={homeHref}
                onClick={handleMenuClose}
              >
                <span aria-hidden="true" className="brand-mark public-brand-mark">
                  <Image
                    alt=""
                    className="brand-logo"
                    height={58}
                    priority
                    src="/images/omaleima-logo.png"
                    width={58}
                  />
                </span>
                <div className="public-brand-copy">
                  <span>OmaLeima</span>
                </div>
              </Link>

              <button
                aria-controls="public-mobile-menu"
                aria-expanded={isMenuOpen}
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                className="public-menu-toggle"
                onClick={handleMenuToggle}
                type="button"
              >
                {isMenuOpen ? (
                  <CloseIcon className="public-inline-icon" />
                ) : (
                  <MenuIcon className="public-inline-icon" />
                )}
              </button>
            </div>

            <div className="public-nav-links" id="public-mobile-menu">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={handleMenuClose}>
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="public-navbar-actions">
              <Link
                className="public-locale-switch"
                href={localeSwitchHref}
                hrefLang={locale === "fi" ? "en" : "fi"}
                onClick={handleMenuClose}
              >
                <LanguageIcon className="public-inline-icon" />
                <span>{localeLabel}</span>
                <strong>{localeSwitchLabel}</strong>
              </Link>
              <Link
                aria-label="OmaLeima Instagram"
                className="public-nav-instagram"
                href={instagramHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                <InstagramIcon className="public-inline-icon" />
              </Link>
              <Link
                className="button button-primary public-nav-contact"
                href={contactHref}
                onClick={handleMenuClose}
              >
                <ContactIcon className="public-inline-icon" />
                {contactLabel}
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </>
  );
};
