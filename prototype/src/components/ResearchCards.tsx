import { BookOpenCheck, CircleHelp } from "lucide-react";

export interface ResearchCardItem {
  title: string;
  records: string;
  question: string;
  owner: string;
}

export function ResearchCards({
  heading,
  description,
  items,
}: {
  heading: string;
  description: string;
  items: ResearchCardItem[];
}) {
  return (
    <section className="research-section" aria-labelledby={`${heading.replaceAll(" ", "-")}-heading`}>
      <div className="section-heading">
        <div>
          <div className="eyebrow">Research for confirmation</div>
          <h2 id={`${heading.replaceAll(" ", "-")}-heading`}>{heading}</h2>
        </div>
        <span className="proposal-badge">Benchmark proposal—not approved by KMC</span>
      </div>
      <p className="research-introduction">{description}</p>
      <div className="research-grid">
        {items.map((item) => (
          <article className="research-card" key={item.title}>
            <div className="research-card-heading">
              <BookOpenCheck size={19} aria-hidden="true" />
              <h3>{item.title}</h3>
            </div>
            <p>{item.records}</p>
            <div className="research-question">
              <CircleHelp size={17} aria-hidden="true" />
              <span>{item.question}</span>
            </div>
            <small>Confirmation owner: {item.owner}</small>
          </article>
        ))}
      </div>
      <p className="research-footnote">
        The cards contain no operational figures or data-entry controls. Uganda requirements remain
        the local starting point; international standards guide questions and field design only.
      </p>
    </section>
  );
}
