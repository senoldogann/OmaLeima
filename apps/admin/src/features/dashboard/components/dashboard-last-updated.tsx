"use client";

import { useEffect, useState } from "react";

const formatElapsed = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
};

export const DashboardLastUpdated = ({ locale }: { locale: "fi" | "en" }) => {
    const [loadedAt] = useState(() => Date.now());
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setElapsed(Date.now() - loadedAt), 10_000);
        return () => clearInterval(id);
    }, [loadedAt]);

    const label = locale === "fi" ? "Päivitetty" : "Updated";

    return (
        <p className="last-updated-indicator">
            <span className="last-updated-dot" aria-hidden />
            {label} {formatElapsed(elapsed)}
        </p>
    );
};
