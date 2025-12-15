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

  const parseDescription = (description: string) => {
    const sections: Array<{type: 'paragraph' | 'list', content: Array<string | {text: string, color: string}>}> = [];

    // Split by double newlines first to separate major sections
    const parts = description.split(/\n\n+/);

    parts.forEach(part => {
      // Split each part by single newlines and clean up
      const lines = part.split('\n').map(l => l.trim()).filter(l => l);

      // Separate intro lines from bullet lines
      const introLines: string[] = [];
      const bulletLines: Array<string | {text: string, color: string}> = [];

      lines.forEach(line => {
        if (line.startsWith('-')) {
          const bulletText = line.substring(1).trim();

          // Check for color markers
          if (bulletText.includes('[yellow]')) {
            bulletLines.push({
              text: bulletText.replace('[yellow]', '').trim(),
              color: 'yellow'
            });
          } else {
            bulletLines.push(bulletText);
          }
        } else if (line) {
          introLines.push(line);
        }
      });

      // Add intro paragraph if exists
      if (introLines.length > 0) {
        sections.push({
          type: 'paragraph',
          content: introLines
        });
      }

      // Add bullet list if exists
      if (bulletLines.length > 0) {
        sections.push({
          type: 'list',
          content: bulletLines
        });
      }
    });

    return sections;
  };

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
            <div className="milestone-content">
              {parseDescription(milestones[expandedMilestone].description).map((section, idx) => (
                section.type === 'paragraph' ? (
                  <p key={idx} className="milestone-paragraph">
                    {section.content.join(' ')}
                  </p>
                ) : (
                  <ul key={idx} className="milestone-list">
                    {section.content.map((item, itemIdx) => {
                      const isObject = typeof item === 'object' && item !== null;
                      const text = isObject ? item.text : item;
                      const color = isObject ? item.color : undefined;

                      return (
                        <li key={itemIdx} className="milestone-list-item">
                          <span className={`milestone-bullet ${color ? `milestone-bullet--${color}` : ''}`} />
                          {text}
                        </li>
                      );
                    })}
                  </ul>
                )
              ))}
            </div>
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
