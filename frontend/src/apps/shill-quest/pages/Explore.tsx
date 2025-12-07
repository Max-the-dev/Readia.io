import { useMemo, useState } from 'react';
import QuestCard from '../components/QuestCard';
import { Quest } from '../types';
import styles from '../ShillQuest.module.css';

interface ExploreProps {
  quests: Quest[];
}

const categories = ['All', 'DeFi', 'NFT', 'Gaming', 'Token Launch', 'Education'];

function Explore({ quests }: ExploreProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = useMemo(() => {
    return quests.filter((quest) => {
      const matchesCategory = category === 'All' || quest.tags.includes(category);
      const matchesSearch = quest.title.toLowerCase().includes(search.toLowerCase()) ||
        quest.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [category, quests, search]);

  return (
    <div className={styles.shell}>
      <div className={styles.sectionHeading}>
        <div>
          <h1 className={styles.sectionTitle}>Explore quests</h1>
          <p className={styles.sectionHint}>Find campaigns that match your content style. More filters coming soon.</p>
        </div>
        <span className={styles.panelPill}>Live MVP</span>
      </div>

      <div className={styles.subSection}>
        <div className={styles.inlineActions}>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.navLink} ${category === cat ? styles.navLinkActive : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className={styles.inlineActions}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quests..."
            className={styles.walletButton}
            style={{ width: '100%', maxWidth: 360 }}
          />
          <span className={styles.comingSoon}>Advanced filters coming soon</span>
        </div>
      </div>

      <div className={styles.sectionHeading}>
        <h2 className={styles.sectionTitle}>Results</h2>
        <span className={styles.sectionHint}>{filtered.length} quests</span>
      </div>

      <div className={styles.questGrid}>
        {filtered.map((quest) => (
          <QuestCard key={quest.id} quest={quest} />
        ))}
      </div>
    </div>
  );
}

export default Explore;
