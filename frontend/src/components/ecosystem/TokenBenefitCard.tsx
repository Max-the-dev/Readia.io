import { ReactNode } from 'react';

interface TokenBenefitCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

function TokenBenefitCard({ icon, title, description }: TokenBenefitCardProps) {
  return (
    <div className="token-benefit-card">
      <div className="token-benefit-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export default TokenBenefitCard;
