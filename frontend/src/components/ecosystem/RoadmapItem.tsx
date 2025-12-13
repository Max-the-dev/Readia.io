interface RoadmapItemProps {
  quarter: string;
  year: string;
  status: 'completed' | 'in-progress' | 'planned';
  title: string;
  milestones: string[];
}

function RoadmapItem({ quarter, year, status, title, milestones }: RoadmapItemProps) {
  return (
    <div className={`roadmap-item roadmap-item--${status}`}>
      <div className="roadmap-timeline-marker">
        <div className="roadmap-dot" />
        <div className="roadmap-line" />
      </div>
      <div className="roadmap-content">
        <div className="roadmap-header">
          <span className="roadmap-date">{quarter} {year}</span>
          <span className={`roadmap-status status--${status}`}>
            {status === 'in-progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        </div>
        <h3>{title}</h3>
        <ul className="roadmap-milestones">
          {milestones.map((milestone, index) => (
            <li key={index}>{milestone}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default RoadmapItem;
