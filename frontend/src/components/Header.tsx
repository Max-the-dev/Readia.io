import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { LayoutDashboard, PenTool, Search } from 'lucide-react';
import AppKitConnectButton from './AppKitConnectButton';
import AuthStatusBadges from './AuthStatusBadges';
import ThemeToggle from './ThemeToggle';
import LibraryBar from './LibraryBar';
import LibraryModal from './LibraryModal';
import { useAuth } from '../contexts/AuthContext';
import { apiService, type UserArticleMeta } from '../services/api';

function Header() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Show library bar only on specific pages
  const showLibraryBar = ['/explore', '/dashboard'].includes(location.pathname) ||
    location.pathname.startsWith('/article/');

  // Library state
  const [historyItems, setHistoryItems] = useState<UserArticleMeta[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<UserArticleMeta[]>([]);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryModalTab, setLibraryModalTab] = useState<'history' | 'favorites'>('history');

  // Fetch library data when authenticated
  useEffect(() => {
    const loadUserLibrary = async () => {
      if (!isAuthenticated) {
        setHistoryItems([]);
        setFavoriteItems([]);
        return;
      }
      try {
        const [historyRes, favoritesRes] = await Promise.all([
          apiService.getHistory(20),
          apiService.getFavorites(20)
        ]);
        if (historyRes.success && historyRes.data) {
          setHistoryItems(historyRes.data);
        }
        if (favoritesRes.success && favoritesRes.data) {
          setFavoriteItems(favoritesRes.data);
        }
      } catch (error) {
        console.error('Failed to load library', error);
      }
    };

    loadUserLibrary();
  }, [isAuthenticated]);

  // Library modal handlers
  const handleOpenHistory = () => {
    setLibraryModalTab('history');
    setShowLibraryModal(true);
  };

  const handleOpenFavorites = () => {
    setLibraryModalTab('favorites');
    setShowLibraryModal(true);
  };

  const handleLibraryDataChange = (history: UserArticleMeta[], favorites: UserArticleMeta[]) => {
    setHistoryItems(history);
    setFavoriteItems(favorites);
  };

  return (
    <>
      <header className="header">
        <div className="container">
          <div className="header-left">
            <ThemeToggle />
            <Link to="/" className="logo">
              <h1>Readia.io</h1>
            </Link>
          </div>
          <nav className="nav-links-center">
            <Link to="/explore" className="link">
              <span className="link-icon"><Search size={20}/></span>
              <span className="link-title">Explore</span>
            </Link>
            <Link to="/write" className="link">
              <span className="link-icon"><PenTool size={20}/></span>
              <span className="link-title">Write</span>
            </Link>
            <Link to="/dashboard" className="link">
              <span className="link-icon"><LayoutDashboard size={20}/></span>
              <span className="link-title">Dashboard</span>
            </Link>
          </nav>
          <div className="auth-container">
            <AppKitConnectButton />
            <AuthStatusBadges />
          </div>
        </div>
      </header>

      {/* Library Sub-Header Bar - only on Explore, Article, Dashboard */}
      {showLibraryBar && (
        <LibraryBar
          onHistoryClick={handleOpenHistory}
          onFavoritesClick={handleOpenFavorites}
        />
      )}

      {/* Library Modal */}
      <LibraryModal
        isOpen={showLibraryModal}
        onClose={() => setShowLibraryModal(false)}
        defaultTab={libraryModalTab}
        onDataChange={handleLibraryDataChange}
      />
    </>
  );
}

export default Header;
