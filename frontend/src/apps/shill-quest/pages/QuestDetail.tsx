import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShieldCheck, Sparkles } from 'lucide-react';
import QuestCard from '../components/QuestCard';
import { Quest } from '../types';
import styles from '../ShillQuest.module.css';

interface QuestDetailProps {
  quests: Quest[];
}

function QuestDetail({ quests }: QuestDetailProps) {
  const { id } = useParams();
  const navigate = useNavigate();

  const quest = useMemo(() => quests.find((q) => q.id === id), [id, quests]);

  if (!quest) {
    return (
      <div className={styles.shell}>
        <h1 className={styles.sectionTitle}>Quest not found</h1>
        <p className={styles.sectionHint}>Try exploring other campaigns.</p>
        <div className={styles.inlineActions}>
          <button type="button" className={styles.primaryBtn} onClick={() => navigate('/shill/explore')}>
            Back to explore
          </button>
        </div>
      </div>
    );
  }

  const related = quests.filter((q) => q.id !== quest.id).slice(0, 3);

  return (
    <div className={styles.shell}>
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionHint}>by {quest.sponsor}</p>
          <h1 className={styles.sectionTitle}>{quest.title}</h1>
          <p className={styles.heroSubtitle}>{quest.description}</p>
        </div>
        <div className={styles.tokenCard} style={{ minWidth: 240 }}>
          <div className={styles.panelHeading}>
            <span className={styles.panelTitle}>Payout</span>
            <span className={styles.panelPill}>Funded</span>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Base</div>
              <div className={styles.panelValue}>${quest.payout.toFixed(2)}</div>
            </div>
            <ShieldCheck size={18} />
          </div>
          {quest.bonus ? (
            <div className={styles.panelItem}>
              <div>
                <div className={styles.panelLabel}>Bonus</div>
                <div className={styles.panelValue}>{quest.bonus}</div>
              </div>
              <Sparkles size={18} />
            </div>
          ) : null}
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Spots</div>
              <div className={styles.panelValue}>
                {quest.spotsTaken}/{quest.spotsTotal}
              </div>
            </div>
            {quest.daysLeft ? <span className={styles.panelPill}>{quest.daysLeft} days left</span> : null}
          </div>
        </div>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <h3 className={styles.heroTitle}>Submission requirements</h3>
          <ul className={styles.heroSubtitle}>
            <li>Include required keywords and links.</li>
            <li>Post on the specified platform; attach URL and screenshot proof.</li>
            <li>Minimum word count applies where relevant.</li>
          </ul>
          <div className={styles.inlineActions}>
            <button type="button" className={styles.primaryBtn}>
              Submit proof (mock)
            </button>
            <span className={styles.comingSoon}>Automated verification coming soon</span>
          </div>
        </div>
        <div className={styles.heroPanel}>
          <div className={styles.panelHeading}>
            <div>
              <div className={styles.panelTitle}>Payout logic</div>
              <p className={styles.muted}>x402 escrow, instant payout on approval.</p>
            </div>
            <span className={styles.panelPill}>MVP</span>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Escrowed budget</div>
              <div className={styles.panelValue}>Pre-funded by sponsor</div>
            </div>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Auto pay</div>
              <div className={styles.panelValue}>Triggered on approval</div>
            </div>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Bonus</div>
              <div className={styles.panelValue}>{quest.bonus || 'Optional'}</div>
            </div>
            <span className={styles.comingSoon}>Bonus oracle (soon)</span>
          </div>
        </div>
      </div>

      <div className={styles.sectionHeading}>
        <h3 className={styles.sectionTitle}>More quests</h3>
      </div>
      <div className={styles.questGrid}>
        {related.map((item) => (
          <QuestCard key={item.id} quest={item} />
        ))}
      </div>
    </div>
  );
}

export default QuestDetail;
