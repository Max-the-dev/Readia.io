import { ReactNode } from 'react';

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  stats?: string;
}

function FeatureCard({ icon, title, description, stats }: FeatureCardProps) {
  return (
    <div className="feature-card">
      <div className="feature-icon">
        {icon}
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      {stats && <span className="feature-stats">{stats}</span>}
    </div>
  );
}

export default FeatureCard;
