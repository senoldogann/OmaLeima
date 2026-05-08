"use client";

import { cookieConsentChangedEventName } from "@/features/privacy/cookie-consent";

type CookieSettingsButtonProps = {
  label: string;
};

export const CookieSettingsButton = ({ label }: CookieSettingsButtonProps) => {
  const handlePress = (): void => {
    window.dispatchEvent(new Event(cookieConsentChangedEventName));
  };

  return (
    <button className="public-footer-chip public-footer-cookie-button" onClick={handlePress} type="button">
      {label}
    </button>
  );
};
