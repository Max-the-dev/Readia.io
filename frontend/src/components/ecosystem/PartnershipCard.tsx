interface PartnershipCardProps {
  name: string;
  logo?: string;
  category: string;
  description: string;
  link?: string;
  tba?: boolean;
}

function PartnershipCard({ name, logo, category, description, link, tba }: PartnershipCardProps) {
  if (tba) {
    return (
      <div className="partnership-card partnership-card--tba">
        <div className="partnership-card__shimmer"></div>
        <div className="partnership-logo">
          <div className="partnership-logo-placeholder partnership-logo-placeholder--tba">?</div>
        </div>
        <span className="partnership-category">{category}</span>
        <h4 className="partnership-name--tba">???</h4>
        <p className="partnership-desc--tba">Coming soon...</p>
        <span className="partnership-badge--tba">TBA</span>
      </div>
    );
  }

  const content = (
    <>
      <div className="partnership-logo">
        {logo ? (
          <img src={logo} alt={name} />
        ) : (
          <div className="partnership-logo-placeholder">{name[0]}</div>
        )}
      </div>
      <span className="partnership-category">{category}</span>
      <h4>{name}</h4>
      <p>{description}</p>
    </>
  );

  if (link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="partnership-card partnership-card--link"
      >
        {content}
      </a>
    );
  }

  return <div className="partnership-card">{content}</div>;
}

export default PartnershipCard;
