interface PartnershipCardProps {
  name: string;
  logo?: string;
  category: string;
  description: string;
  link?: string;
}

function PartnershipCard({ name, logo, category, description, link }: PartnershipCardProps) {
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
