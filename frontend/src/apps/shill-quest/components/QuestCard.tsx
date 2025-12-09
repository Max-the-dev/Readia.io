import { ArrowRight } from 'lucide-react';
import { Quest, extractXHandle } from '../types';
import styles from '../ShillQuest.module.css';

interface QuestCardProps {
  quest: Quest;
  onClick?: (quest: Quest) => void;
}

function QuestCard({ quest, onClick }: QuestCardProps) {
  const handle = extractXHandle(quest.xUrl);
  const hasBonus = quest.bonusAmount && quest.bonusAmount > 0;

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
          by @{handle} • ${quest.budgetUsed}/${quest.totalBudget}
        </div>
        <div className={styles.questPrice}>
          ${quest.payoutPerPost.toFixed(2)}/task
        </div>
      </div>

      <div className={styles.questTags}>
        <span className={styles.tag}>{quest.category}</span>
        <span className={styles.tag}>{quest.contentType}</span>
        {hasBonus && <span className={styles.tag}>+${quest.bonusAmount} bonus</span>}
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
