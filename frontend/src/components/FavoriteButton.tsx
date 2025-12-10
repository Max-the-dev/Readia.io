import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAuthToast } from '../contexts/AuthToastContext';
import { useWallet } from '../contexts/WalletContext';

interface FavoriteButtonProps {
  articleId: number;
  className?: string;
  onFavoriteChange?: (articleId: number, isFavorited: boolean) => void;
}

function FavoriteButton({ articleId, className = '', onFavoriteChange }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pendingFavoriteAction = useRef(false);

  const { isAuthenticated } = useAuth();
  const { showAuthToast, hideAuthToast } = useAuthToast();
  const { address } = useWallet();

  // Check if article is favorited on mount
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!isAuthenticated || !address) return;

      try {
        const response = await apiService.getFavoriteStatus(articleId);
        if (response.success && response.data) {
          setIsFavorited(response.data.isFavorited);
        }
      } catch (error) {
        console.error('Error checking favorite status:', error);
      }
    };

    checkFavoriteStatus();
  }, [articleId, isAuthenticated, address]);

  // Listen for favorite changes from other components (e.g., LibraryModal)
  useEffect(() => {
    const handleFavoriteChanged = (event: Event) => {
      const { articleId: changedId, isFavorited: newState } = (event as CustomEvent).detail;
      if (changedId === articleId) {
        setIsFavorited(newState);
      }
    };

    window.addEventListener('favoriteChanged', handleFavoriteChanged);
    return () => {
      window.removeEventListener('favoriteChanged', handleFavoriteChanged);
    };
  }, [articleId]);

  // Retry favorite action after authentication
  useEffect(() => {
    const retryFavoriteAction = async () => {
      if (isAuthenticated && pendingFavoriteAction.current && address) {
        pendingFavoriteAction.current = false;
        hideAuthToast();
        await performFavoriteAction();
      }
    };

    retryFavoriteAction();
  }, [isAuthenticated, address, hideAuthToast]);

  const performFavoriteAction = async () => {
    if (!address || isLoading) return;

    const previousState = isFavorited;
    const newState = !isFavorited;

    // Optimistic update
    setIsFavorited(newState);
    onFavoriteChange?.(articleId, newState);

    setIsLoading(true);
    try {
      const response = await apiService.setFavorite(articleId, newState);
      if (!response.success) {
        // Rollback on failure
        setIsFavorited(previousState);
        onFavoriteChange?.(articleId, previousState);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Rollback on error
      setIsFavorited(previousState);
      onFavoriteChange?.(articleId, previousState);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (isLoading) return;

    // If user is not authenticated, show global auth toast
    if (!isAuthenticated || !address) {
      pendingFavoriteAction.current = true;
      showAuthToast('Authenticate to favorite articles');
      return;
    }

    await performFavoriteAction();
  };

  return (
    <button
      className={`favorite-button ${isFavorited ? 'favorite-button-active' : ''} ${isLoading ? 'favorite-button-loading' : ''} ${className}`}
      onClick={handleFavoriteToggle}
      disabled={isLoading}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star size={16} fill={isFavorited ? 'currentColor' : 'none'} />
    </button>
  );
}

export default FavoriteButton;
