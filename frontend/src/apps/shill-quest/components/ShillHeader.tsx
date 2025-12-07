import { NavLink } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import ThemeToggle from '../../../components/ThemeToggle';
import styles from '../ShillQuest.module.css';

function ShillHeader() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`.trim();

  return (
    <div className={styles.topbar}>
      <div className={styles.brand}>
        <span>ShillQuest</span>
        <span className={styles.brandBadge}>by Readia</span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/shill" end className={linkClass}>
          Quests
        </NavLink>
        <NavLink to="/shill/explore" className={linkClass}>
          Explore
        </NavLink>
        <NavLink to="/shill/create" className={linkClass}>
          Create
        </NavLink>
      </nav>

      <div className={styles.actions}>
        <ThemeToggle />
        <button type="button" className={styles.walletButton}>
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    </div>
  );
}

export default ShillHeader;
