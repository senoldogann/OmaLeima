type PublicIconProps = {
  className?: string;
};

export const ContactIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M4.75 6.75h14.5v10.5H4.75z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="m5.25 7.25 6.25 5.15a.8.8 0 0 0 1.01 0l6.24-5.15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const BuildingIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M6.75 19.25V6.25a1 1 0 0 1 1-1h8.5a1 1 0 0 1 1 1v13M4.75 19.25h14.5M10 9h.01M14 9h.01M10 12.5h.01M14 12.5h.01M11 19.25v-3.5h2v3.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const InstagramIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <rect
      height="14.5"
      rx="4.25"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      width="14.5"
      x="4.75"
      y="4.75"
    />
    <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.8" />
    <path d="M16.7 7.45h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
  </svg>
);

export const LanguageIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="7.25" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="M5.25 12h13.5M12 4.75c2.25 2.02 3.4 4.43 3.4 7.25s-1.15 5.23-3.4 7.25c-2.25-2.02-3.4-4.43-3.4-7.25s1.15-5.23 3.4-7.25Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const MapPinIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M12 20.25s5-4.82 5-9a5 5 0 1 0-10 0c0 4.18 5 9 5 9Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <circle cx="12" cy="11.25" r="1.85" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const MenuIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M4.75 7.25h14.5M4.75 12h14.5M4.75 16.75h14.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const PhoneIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M6.67 5.75h2.08a1 1 0 0 1 .96.71l.7 2.35a1 1 0 0 1-.25.99l-1.21 1.2a11.47 11.47 0 0 0 4.05 4.05l1.2-1.21a1 1 0 0 1 .99-.25l2.35.7a1 1 0 0 1 .71.96v2.08a1 1 0 0 1-.9 1 12.89 12.89 0 0 1-5.13-.48 13.25 13.25 0 0 1-8.25-8.25 12.89 12.89 0 0 1-.48-5.13 1 1 0 0 1 1-.9Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

export const CloseIcon = ({ className }: PublicIconProps) => (
  <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
    <path
      d="M7.25 7.25 16.75 16.75M16.75 7.25 7.25 16.75"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
    />
  </svg>
);
