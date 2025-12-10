import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Clock, Star, BookOpen } from 'lucide-react';
import { apiService, type UserArticleMeta } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/components/library.css';

type TabType = 'history' | 'favorites';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: TabType;
  onDataChange?: (history: UserArticleMeta[], favorites: UserArticleMeta[]) => void;
}

function LibraryModal({
  isOpen,
  onClose,
  defaultTab = 'history',
  onDataChange,
}: LibraryModalProps) {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [historyItems, setHistoryItems] = useState<UserArticleMeta[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<UserArticleMeta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset tab when modal opens with different default
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Fetch data when modal opens
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !isAuthenticated) return;

      setLoading(true);
      setError('');

      try {
        const [historyRes, favoritesRes] = await Promise.all([
          apiService.getHistory(20),
          apiService.getFavorites(20),
        ]);

        if (historyRes.success && historyRes.data) {
          setHistoryItems(historyRes.data);
        }
        if (favoritesRes.success && favoritesRes.data) {
          setFavoriteItems(favoritesRes.data);
        }

        // Notify parent of data changes
        if (onDataChange) {
          onDataChange(
            historyRes.data || [],
            favoritesRes.data || []
          );
        }
      } catch (err) {
        console.error('Failed to load library data:', err);
        setError('Failed to load your library');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isOpen, isAuthenticated]);

  const handleRemoveFavorite = async (articleId: number) => {
    try {
      const res = await apiService.setFavorite(articleId, false);
      if (res.success) {
        const updated = favoriteItems.filter(item => item.id !== articleId);
        setFavoriteItems(updated);
        if (onDataChange) {
          onDataChange(historyItems, updated);
        }
      }
    } catch (err) {
      console.error('Failed to remove favorite:', err);
    }
  };

  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };

  const previewSnippet = (html?: string) => {
    const text = stripHtmlTags(html || '');
    return text.length > 100 ? `${text.slice(0, 100)}...` : text;
  };

  if (!isOpen) return null;

  const currentItems = activeTab === 'history' ? historyItems : favoriteItems;

  return (
    <div className="library-modal-overlay" onClick={onClose}>
      <div className="library-modal" onClick={(e) => e.stopPropagation()}>
        <div className="library-modal__header">
          <h2>Your Library</h2>
          <button
            type="button"
            className="library-modal__close"
            onClick={onClose}
            aria-label="Close library"
          >
            <X size={20} />
          </button>
        </div>

        <div className="library-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={`library-modal__tab${activeTab === 'history' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={16} />
            History
            {historyItems.length > 0 && (
              <span className="library-modal__tab-count">{historyItems.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`library-modal__tab${activeTab === 'favorites' ? ' is-active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={16} />
            Favorites
            {favoriteItems.length > 0 && (
              <span className="library-modal__tab-count">{favoriteItems.length}</span>
            )}
          </button>
        </div>

        <div className="library-modal__content" role="tabpanel">
          {loading ? (
            <div className="library-modal__loading">
              <p>Loading...</p>
            </div>
          ) : error ? (
            <div className="library-modal__error">
              <p>{error}</p>
            </div>
          ) : currentItems.length === 0 ? (
            <div className="library-modal__empty">
              <BookOpen size={40} />
              <h3>
                {activeTab === 'history'
                  ? 'No reading history yet'
                  : 'No favorites yet'}
              </h3>
              <p>
                {activeTab === 'history'
                  ? 'Articles you read will appear here'
                  : 'Save articles to quickly find them later'}
              </p>
            </div>
          ) : (
            <div className="library-modal__grid">
              {currentItems.map((item) => (
                <div key={item.id} className="library-card">
                  <Link to={`/article/${item.id}`} className="library-card__link" onClick={onClose}>
                    <div className="library-card__meta">
                      <span className="library-card__date">
                        {new Date(
                          activeTab === 'history'
                            ? item.lastReadAt || item.publishDate
                            : item.favoritedAt || item.publishDate
                        ).toLocaleDateString()}
                      </span>
                      <span className="library-card__author">
                        @{item.authorAddress.slice(0, 6)}...{item.authorAddress.slice(-4)}
                      </span>
                    </div>
                    <h4 className="library-card__title">{item.title}</h4>
                    <p className="library-card__preview">{previewSnippet(item.preview)}</p>
                    {item.categories && item.categories.length > 0 && (
                      <div className="library-card__tags">
                        {item.categories.slice(0, 2).map((cat, idx) => (
                          <span key={idx} className="library-card__tag">{cat}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                  {activeTab === 'favorites' && (
                    <button
                      type="button"
                      className="library-card__remove"
                      onClick={() => handleRemoveFavorite(item.id)}
                      aria-label="Remove from favorites"
                      title="Remove from favorites"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryModal;
