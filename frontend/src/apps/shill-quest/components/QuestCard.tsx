import { ArrowRight, Flame } from 'lucide-react';
import { Quest } from '../types';
import styles from '../ShillQuest.module.css';

interface QuestCardProps {
  quest: Quest;
  onClick?: (quest: Quest) => void;
}

function QuestCard({ quest, onClick }: QuestCardProps) {
  return (
    <button
      type="button"
      className={styles.questCard}
      onClick={() => onClick?.(quest)}
    >
      <div>
        <div className={styles.questTitle}>{quest.title}</div>
        <p className={styles.questDescription}>{quest.description}</p>
      </div>

      <div className={styles.questMeta}>
        <div className={styles.questSponsor}>
          by {quest.sponsor} • {quest.spotsTaken}/{quest.spotsTotal}
        </div>
        <div className={styles.questPrice}>
          ${quest.payout.toFixed(2)}
        </div>
      </div>

      <div className={styles.questTags}>
        {quest.tags.map((tag) => (
          <span key={tag} className={`${styles.tag} ${tag === 'Hot' || quest.hot ? styles.tagHot : ''}`}>
            {tag === 'Hot' ? <Flame size={14} /> : null}
            {tag}
          </span>
        ))}
        {quest.bonus ? <span className={styles.tag}>{quest.bonus}</span> : null}
        {quest.daysLeft ? <span className={styles.tag}>{quest.daysLeft} days left</span> : null}
      </div>

      <div className={styles.inlineActions}>
        <span className={styles.badge}>Instant payout</span>
        <span className={styles.badgePurple}>x402 escrow</span>
        <span className={styles.tag}>
          View quest <ArrowRight size={14} />
        </span>
      </div>
    </button>
  );
}

export default QuestCard;
