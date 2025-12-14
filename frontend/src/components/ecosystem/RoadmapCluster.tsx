import { useState } from 'react';
import { X } from 'lucide-react';

interface MilestoneItem {
  label: string;
  details?: string[];
  expandable?: boolean;
}

interface RoadmapClusterProps {
  period: string;
  status: 'completed' | 'in-progress' | 'planned';
  coreItem: string;
  satellites: MilestoneItem[];
}

function RoadmapCluster({ period, status, coreItem, satellites }: RoadmapClusterProps) {
  const [expandedItem, setExpandedItem] = useState<MilestoneItem | null>(null);

  const handleSatelliteClick = (item: MilestoneItem) => {
    if (item.expandable && item.details) {
      setExpandedItem(item);
    }
  };

  return (
    <>
      <div className={`roadmap-cluster roadmap-cluster--${status}`}>
        {/* Period label */}
        <div className="cluster-period">
          <span className={`cluster-status cluster-status--${status}`}>
            {status === 'in-progress' ? 'In Progress' : status === 'completed' ? 'Completed' : 'Planned'}
          </span>
          <span className="cluster-date">{period}</span>
        </div>

        {/* Bubble container */}
        <div className="cluster-bubbles">
          {/* Core bubble */}
          <div className="cluster-core">
            <span>{coreItem}</span>
          </div>

          {/* Satellite bubbles */}
          {satellites.map((item, index) => (
            <button
              key={index}
              className={`cluster-satellite cluster-satellite--${index} ${item.expandable ? 'cluster-satellite--expandable' : ''}`}
              onClick={() => handleSatelliteClick(item)}
              disabled={!item.expandable}
              style={{ '--satellite-index': index } as React.CSSProperties}
            >
              {item.label}
              {item.expandable && <span className="satellite-expand-hint">+</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Modal for expanded details */}
      {expandedItem && (
        <div className="roadmap-modal-overlay" onClick={() => setExpandedItem(null)}>
          <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
            <button className="roadmap-modal-close" onClick={() => setExpandedItem(null)}>
              <X size={20} />
            </button>
            <h3>{expandedItem.label}</h3>
            {expandedItem.details && (
              <ul className="roadmap-modal-details">
                {expandedItem.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default RoadmapCluster;
