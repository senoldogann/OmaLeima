"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

import type { DashboardLocale } from "@/features/dashboard/i18n";

type DashboardLocaleSwitchProps = {
  hrefLang: DashboardLocale;
  label: string;
  title: string;
};

export const DashboardLocaleSwitch = ({ hrefLang, label, title }: DashboardLocaleSwitchProps) => {
  const pathname = usePathname();
  const [isPending, setIsPending] = useState(false);

  const handleClick = (): void => {
    setIsPending(true);

    const returnTo = typeof pathname === "string" && pathname.length > 0 ? pathname : "/admin";
    const searchParams = new URLSearchParams({
      locale: hrefLang,
      returnTo,
    });

    window.location.assign(`/api/dashboard-locale?${searchParams.toString()}`);
  };

  return (
    <button
      className="dashboard-locale-switch"
      disabled={isPending}
      lang={hrefLang}
      onClick={handleClick}
      type="button"
    >
      <span>{title}</span>
      <strong>{label}</strong>
    </button>
  );
};
