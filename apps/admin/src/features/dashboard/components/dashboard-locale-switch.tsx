"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";

type DashboardLocaleSwitchProps = {
  currentLocale: DashboardLocale;
  title: string;
};

export const DashboardLocaleSwitch = ({ currentLocale, title }: DashboardLocaleSwitchProps) => {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);

  const handleClick = (locale: DashboardLocale): void => {
    if (locale === currentLocale) {
      return;
    }

    setIsPending(true);

    const returnTo = typeof pathname === "string" && pathname.length > 0 ? pathname : "/admin";
    const searchParams = new URLSearchParams({
      locale,
      returnTo,
    });

    window.location.assign(`/api/dashboard-locale?${searchParams.toString()}`);
  };

  return (
    <div className="dashboard-locale-switch">
      <span className="dashboard-locale-switch-title">{title}</span>
      <div
        aria-label={title}
        className="dashboard-locale-switch-track"
        role="group"
      >
        {([
          { label: "FI", locale: "fi" },
          { label: "EN", locale: "en" },
        ] as const).map((option) => {
          const isActive = currentLocale === option.locale;

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "dashboard-locale-switch-option dashboard-locale-switch-option-active" : "dashboard-locale-switch-option"}
              disabled={isPending}
              key={option.locale}
              lang={option.locale}
              onClick={() => handleClick(option.locale)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
