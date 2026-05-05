// Panel sayfalarinin ortak baslik bandi. Eski hero foto background'unu degistirir;
// yalin ve butun panel sayfalarinda ayni hizalamayi sunar.

type PageHeaderProps = {
    actions?: React.ReactNode;
    eyebrow: string;
    subtitle: string;
    title: string;
};

export const PageHeader = ({ actions, eyebrow, subtitle, title }: PageHeaderProps) => (
    <header className="page-header">
        <div className="page-header-content">
            <div className="eyebrow">{eyebrow}</div>
            <h2 className="page-header-title">{title}</h2>
            <p className="page-header-subtitle">{subtitle}</p>
        </div>
        {actions === undefined ? null : <div className="page-header-actions">{actions}</div>}
    </header>
);
