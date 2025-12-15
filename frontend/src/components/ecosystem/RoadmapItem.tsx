import { useState } from 'react';
import { ChevronRight, X } from 'lucide-react';

interface Milestone {
  title: string;
  expandable?: boolean;
  description?: string;
}

interface RoadmapItemProps {
  quarter: string;
  year: string;
  status: 'completed' | 'in-progress' | 'planned';
  title: string;
  milestones: Milestone[];
  index: number;
}

function RoadmapItem({ quarter, year, status, title, milestones, index }: RoadmapItemProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<number | null>(null);

  const handleMilestoneClick = (idx: number, milestone: Milestone) => {
    if (milestone.expandable) {
      setExpandedMilestone(idx);
    }
  };

  const handleCloseModal = () => {
    setExpandedMilestone(null);
  };

  return (
    <div className={`roadmap-item roadmap-item--${status}`}>
      <div className="roadmap-timeline-marker">
        <span className="roadmap-date">{quarter} {year}</span>
      </div>

      <div className={`roadmap-content ${expandedMilestone !== null ? 'roadmap-content--slid' : ''}`}>
        <div className="roadmap-content-header">
          <h3>{title}</h3>
          <div className={`roadmap-indicator roadmap-indicator--${status}`} />
        </div>

        <ul className="roadmap-milestones">
          {milestones.map((milestone, idx) => (
            <li
              key={idx}
              className={`roadmap-milestone ${milestone.expandable ? 'roadmap-milestone--expandable' : ''}`}
              onClick={() => handleMilestoneClick(idx, milestone)}
            >
              <span className="milestone-title">
                {milestone.title}
              </span>
              {milestone.expandable && (
                <ChevronRight size={16} className="milestone-icon" />
              )}
            </li>
          ))}
        </ul>

        {expandedMilestone !== null && milestones[expandedMilestone]?.description && (
          <div className="milestone-modal">
            <button className="milestone-modal-close" onClick={handleCloseModal}>
              <X size={20} />
            </button>
            <h4>{milestones[expandedMilestone].title}</h4>
            <p className="milestone-description">
              {milestones[expandedMilestone].description}
            </p>
          </div>
        )}
      </div>

      {expandedMilestone !== null && milestones[expandedMilestone]?.description && (
        <div className="milestone-modal-overlay" onClick={handleCloseModal} />
      )}
    </div>
  );
}

export default RoadmapItem;
