interface RoadmapClusterProps {
  period: string;
  status: 'completed' | 'in-progress' | 'planned';
  title: string;
  icon: JSX.Element;
  milestones: string[];
}

function RoadmapCluster({ period, status, title, icon, milestones }: RoadmapClusterProps) {
  return (
    <div className={`roadmap-item roadmap-item--${status}`}>
      <div className="roadmap-card">
        <div className="roadmap-header">
          <h3>{period}</h3>
          <span className={`roadmap-badge roadmap-badge--${status}`}>
            {status === 'in-progress' ? 'In Progress' : status === 'completed' ? 'Completed' : 'Planned'}
          </span>
        </div>
        <div className="roadmap-theme">
          {icon}
          <span>{title}</span>
        </div>
        <ul className="roadmap-list">
          {milestones.map((milestone, index) => (
            <li key={index}>{milestone}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RoadmapCluster;
