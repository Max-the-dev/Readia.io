import { Clock, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAuthToast } from '../contexts/AuthToastContext';
import '../styles/components/library.css';

interface LibraryBarProps {
  historyCount?: number;
  favoritesCount?: number;
  onHistoryClick: () => void;
  onFavoritesClick: () => void;
}

function LibraryBar({
  historyCount,
  favoritesCount,
  onHistoryClick,
  onFavoritesClick,
}: LibraryBarProps) {
  const { isAuthenticated } = useAuth();
  const { showAuthToast } = useAuthToast();

  const handleHistoryClick = () => {
    if (!isAuthenticated) {
      showAuthToast('Authenticate to view your reading history');
      return;
    }
    onHistoryClick();
  };

  const handleFavoritesClick = () => {
    if (!isAuthenticated) {
      showAuthToast('Authenticate to view your favorites');
      return;
    }
    onFavoritesClick();
  };

  return (
    <div className="library-bar">
      <div className="library-bar__content">
        <button
          type="button"
          className="library-bar__btn"
          onClick={handleHistoryClick}
          aria-label="View reading history"
          title="History"
        >
          <Clock size={18} />
          {isAuthenticated && historyCount !== undefined && historyCount > 0 && (
            <span className="library-bar__badge">{historyCount}</span>
          )}
        </button>
        <button
          type="button"
          className="library-bar__btn library-bar__btn--primary"
          onClick={handleFavoritesClick}
          aria-label="View favorites"
          title="Favorites"
        >
          <Star size={18} />
          {isAuthenticated && favoritesCount !== undefined && favoritesCount > 0 && (
            <span className="library-bar__badge">{favoritesCount}</span>
          )}
        </button>
      </div>
    </div>
  );
}

export default LibraryBar;
