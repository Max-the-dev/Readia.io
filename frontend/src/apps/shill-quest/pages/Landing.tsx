import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import QuestCard from '../components/QuestCard';
import { Quest } from '../types';
import styles from '../ShillQuest.module.css';

interface LandingProps {
  quests: Quest[];
}

function Landing({ quests }: LandingProps) {
  const featured = quests.slice(0, 3);

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <div className={styles.heroBadges}>
            <span className={styles.badge}><Sparkles size={14} /> Instant creator payouts</span>
            <span className={`${styles.badge} ${styles.badgePurple}`}>Funded by projects</span>
          </div>
          <h1 className={styles.heroTitle}>Get paid to shill projects you believe in.</h1>
          <p className={styles.heroSubtitle}>
            Projects post quests, pre-fund budgets, and auto-pay creators via x402. Submit proof, get approved, receive instant payouts.
          </p>
          <div className={styles.heroActions}>
            <a href="/shill/explore" className={styles.primaryBtn}>
              Browse quests <ArrowRight size={16} />
            </a>
            <a href="/shill/create" className={styles.ghostBtn}>
              Post a campaign
            </a>
          </div>
          <div className={styles.heroStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Average payout</div>
              <div className={styles.statValue}>$7.80</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Time to pay</div>
              <div className={styles.statValue}>Instant on approval</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Funded budget</div>
              <div className={styles.statValue}>$18,200 live</div>
            </div>
          </div>
        </div>

        <div className={styles.heroPanel}>
          <div className={styles.panelHeading}>
            <div>
              <div className={styles.panelTitle}>Campaign autopay</div>
              <p className={styles.muted}>Budget is escrowed. On accept, x402 pays creators automatically.</p>
            </div>
            <span className={styles.panelPill}>Coming soon</span>
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Budget funded</div>
              <div className={styles.panelValue}>$5,000 USDC</div>
            </div>
            <CheckCircle2 color="#10b981" />
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Auto payouts</div>
              <div className={styles.panelValue}>Instant on approval</div>
            </div>
            <CheckCircle2 color="#10b981" />
          </div>
          <div className={styles.panelItem}>
            <div>
              <div className={styles.panelLabel}>Bonus rules</div>
              <div className={styles.panelValue}>Engagement-based</div>
            </div>
            <span className={styles.comingSoon}>Bonus oracle (soon)</span>
          </div>
        </div>
      </section>

      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Active quests</h2>
        <a href="/shill/explore" className={styles.ghostBtn}>
          View all
        </a>
      </div>
      <div className={styles.questGrid}>
        {featured.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>

      <div className={styles.sectionHeading}>
        <h3 className={styles.sectionTitle}>$READ utility perks</h3>
        <span className={styles.sectionHint}>Soft-power benefits; core UX stays in stables/SOL/Base.</span>
      </div>
      <div className={styles.tokenCard}>
        <div className={styles.tokenHeader}>
          <div className={styles.tokenTitle}>$READ perks for quests</div>
          <span className={styles.tokenBadge}>Optional</span>
        </div>
        <div className={styles.tokenBenefits}>
          <div className={styles.tokenBenefit}>
            <strong>Fee rebates</strong>
            <p className={styles.muted}>Projects funding with/holding $READ get lower platform fees.</p>
          </div>
          <div className={styles.tokenBenefit}>
            <strong>Priority placement</strong>
            <p className={styles.muted}>Higher listing priority for $READ-aligned campaigns.</p>
          </div>
          <div className={styles.tokenBenefit}>
            <strong>Creator boosts</strong>
            <p className={styles.muted}>Holding/locking $READ unlocks faster review and lower take rate.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
