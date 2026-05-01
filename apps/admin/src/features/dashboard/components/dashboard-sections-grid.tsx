import type { DashboardSection } from "@/features/dashboard/types";

type DashboardSectionsGridProps = {
  sections: DashboardSection[];
};

export const DashboardSectionsGrid = ({ sections }: DashboardSectionsGridProps) => (
  <section className="content-grid">
    {sections.map((section) => (
      <article
        key={section.title}
        className={`panel ${section.tone === "accent" ? "panel-accent" : section.tone === "warning" ? "panel-warning" : ""}`}
      >
        <div className="stack-sm">
          <h3 className="section-title">{section.title}</h3>
          <ul className="list">
            {section.items.map((item) => (
              <li key={item} className="list-item">
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </article>
    ))}
  </section>
);
