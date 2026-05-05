// Sidebar ve dashboard shortcut'larinda kullanilan tipli inline SVG icon switch'i.
// Yeni bir icon paketi yerine ufak, gerekli set; eklemek icin ad ekle ve render kolu ekle.

export type NavIconName =
    | "dashboard"
    | "oversight"
    | "applications"
    | "tags"
    | "events"
    | "announcements"
    | "claims"
    | "fraud"
    | "rewards"
    | "venues"
    | "audit"
    | "settings";

type NavIconProps = {
    name: NavIconName;
};

const sharedSvgProps = {
    fill: "none",
    height: "20",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: "1.6",
    viewBox: "0 0 24 24",
    width: "20",
};

export const NavIcon = ({ name }: NavIconProps) => {
    switch (name) {
        case "dashboard":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <rect height="8" rx="1.6" width="8" x="3" y="3" />
                    <rect height="5" rx="1.6" width="8" x="13" y="3" />
                    <rect height="8" rx="1.6" width="8" x="13" y="13" />
                    <rect height="5" rx="1.6" width="8" x="3" y="16" />
                </svg>
            );
        case "oversight":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M2.6 12C4.7 7.6 8.1 5 12 5s7.3 2.6 9.4 7c-2.1 4.4-5.5 7-9.4 7s-7.3-2.6-9.4-7Z" />
                </svg>
            );
        case "applications":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M5 4h10l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
                    <path d="M14 4v5h5" />
                    <path d="M8 13h8M8 17h5" />
                </svg>
            );
        case "tags":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
                    <circle cx="8" cy="8" r="1.4" />
                </svg>
            );
        case "events":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <rect height="16" rx="2" width="18" x="3" y="5" />
                    <path d="M3 10h18M8 3v4M16 3v4" />
                    <path d="M8 14h3" />
                </svg>
            );
        case "announcements":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M4 10v4l11 5V5L4 10Z" />
                    <path d="M4 10H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h1" />
                    <path d="M18 8a4 4 0 0 1 0 8" />
                </svg>
            );
        case "claims":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M20 7 9 18l-5-5" />
                    <path d="M14 4h6v6" />
                </svg>
            );
        case "fraud":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M12 3 2 21h20L12 3Z" />
                    <path d="M12 10v5M12 18h.01" />
                </svg>
            );
        case "rewards":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <circle cx="12" cy="9" r="5" />
                    <path d="m8.5 13-1.5 8 5-3 5 3-1.5-8" />
                </svg>
            );
        case "venues":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <path d="M12 22s7-7 7-12a7 7 0 0 0-14 0c0 5 7 12 7 12Z" />
                    <circle cx="12" cy="10" r="2.5" />
                </svg>
            );
        case "audit":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <rect height="18" rx="2" width="14" x="5" y="3" />
                    <path d="M9 8h6M9 12h6M9 16h4" />
                </svg>
            );
        case "settings":
            return (
                <svg aria-hidden {...sharedSvgProps}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
                </svg>
            );
    }
};
