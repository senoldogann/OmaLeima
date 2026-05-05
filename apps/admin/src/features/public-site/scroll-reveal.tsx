"use client";

import { useEffect } from "react";

/* Sayfa yüklenince .public-shell elementlerini gözlemler.
   Görünüm alanına girdiklerinde data-visible="true" ekler. */
export const ScrollRevealProvider = () => {
    useEffect(() => {
        const targets = document.querySelectorAll<HTMLElement>(".public-shell");

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        (entry.target as HTMLElement).dataset.visible = "true";
                        observer.unobserve(entry.target);
                    }
                }
            },
            { rootMargin: "0px 0px -60px 0px", threshold: 0.06 },
        );

        for (const el of targets) {
            observer.observe(el);
        }

        return () => observer.disconnect();
    }, []);

    return null;
};
