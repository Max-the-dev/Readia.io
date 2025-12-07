import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import styles from '../ShillQuest.module.css';

function CreateQuest() {
  return (
    <div className={styles.shell}>
      <div className={styles.sectionHeading}>
        <div>
          <h1 className={styles.sectionTitle}>Post a campaign</h1>
          <p className={styles.sectionHint}>MVP flow: outline your quest, fund budget, approve submissions. Full automation coming soon.</p>
        </div>
        <span className={styles.comingSoon}>Self-serve v1 launching</span>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroCopy}>
          <h2 className={styles.heroTitle}>Quick setup (pilot)</h2>
          <p className={styles.heroSubtitle}>
            For the first campaigns we’ll white-glove onboarding. Share your quest details and budget, and we’ll provision the escrow + review queue.
          </p>
          <div className={styles.heroActions}>
            <a href="mailto:team@readia.io?subject=ShillQuest%20Campaign" className={styles.primaryBtn}>
              Talk to us <ArrowRight size={16} />
            </a>
            <a href="/shill" className={styles.ghostBtn}>Back to quests</a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Base payout</div>
              <div className={styles.statValue}>Set per submission</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Budget</div>
              <div className={styles.statValue}>Pre-funded via x402</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Bonuses</div>
              <div className={styles.statValue}>Engagement-based (optional)</div>
            </div>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.panelHeading}>
            <div>
              <div className={styles.panelTitle}>Automation roadmap</div>
              <p className={styles.muted}>What will be live next.</p>
            </div>
            <span className={styles.panelPill}>Roadmap</span>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Quest builder</div>
              <div className={styles.panelValue}>Templates + criteria checks</div>
            </div>
            <Clock size={16} />
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Auto verification</div>
              <div className={styles.panelValue}>Keywords, min words, link whitelist</div>
            </div>
            <CheckCircle2 color="#10b981" />
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Bonus payouts</div>
              <div className={styles.panelValue}>Engagement attestations</div>
            </div>
            <span className={styles.comingSoon}>Oracle hookup (soon)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateQuest;
