import { useState, useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAuthToast } from '../contexts/AuthToastContext';

interface LikeButtonProps {
  articleId: number;
  userAddress: string | undefined;
  initialLikes: number;
  className?: string;
  onLikeChange?: (articleId: number, newLikeCount: number) => void;
}

function LikeButton({ articleId, userAddress, initialLikes, className = '', onLikeChange }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const pendingLikeAction = useRef(false);

  const { isAuthenticated } = useAuth();
  const { showAuthToast, hideAuthToast } = useAuthToast();

  // Update likes when initialLikes prop changes
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  // Check if user has already liked this article
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!userAddress) return;

      try {
        const response = await apiService.checkUserLikedArticle(articleId, userAddress);
        if (response.success && response.data) {
          setIsLiked(response.data.liked);
        }
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();
  }, [articleId, userAddress]);

  // Retry like action after authentication
  useEffect(() => {
    const retryLikeAction = async () => {
      if (isAuthenticated && pendingLikeAction.current && userAddress) {
        pendingLikeAction.current = false;
        hideAuthToast();

        // Execute the like action
        await performLikeAction();
      }
    };

    retryLikeAction();
  }, [isAuthenticated, userAddress, hideAuthToast]);

  const performLikeAction = async () => {
    if (!userAddress || isLoading) return;

    // Store previous state for rollback
    const previousIsLiked = isLiked;
    const previousLikes = likes;

    // Optimistic update - update UI immediately
    const newIsLiked = !isLiked;
    const newCount = newIsLiked ? likes + 1 : likes - 1;

    setIsLiked(newIsLiked);
    setLikes(newCount);
    onLikeChange?.(articleId, newCount);

    setIsLoading(true);
    try {
      if (previousIsLiked) {
        // Unlike the article
        const response = await apiService.unlikeArticle(articleId, userAddress);
        if (!response.success) {
          // Rollback on failure
          setIsLiked(previousIsLiked);
          setLikes(previousLikes);
          onLikeChange?.(articleId, previousLikes);
        }
      } else {
        // Like the article
        const response = await apiService.likeArticle(articleId, userAddress);
        if (!response.success || !response.data?.liked) {
          // Rollback on failure or if already liked
          setIsLiked(previousIsLiked);
          setLikes(previousLikes);
          onLikeChange?.(articleId, previousLikes);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Rollback on error
      setIsLiked(previousIsLiked);
      setLikes(previousLikes);
      onLikeChange?.(articleId, previousLikes);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    if (isLoading) return;

    // If user is not authenticated, show global auth toast
    if (!isAuthenticated || !userAddress) {
      pendingLikeAction.current = true;
      showAuthToast('🔐 Authenticate to like articles');
      return;
    }

    // User is authenticated, perform like action
    await performLikeAction();
  };

  if (!userAddress && !isAuthenticated) {
    return (
      <button
        className={`like-button ${className}`}
        onClick={handleLikeToggle}
        disabled={isLoading}
        title="Authenticate to like this article"
      >
        <Heart size={16} />
        <span>{likes}</span>
      </button>
    );
  }

  return (
    <button
      className={`like-button ${isLiked ? 'like-button-liked' : ''} ${isLoading ? 'like-button-loading' : ''} ${className}`}
      onClick={handleLikeToggle}
      disabled={isLoading}
      title={isLiked ? 'Unlike this article' : 'Like this article'}
    >
      <Heart size={16} fill={isLiked ? 'currentColor' : 'none'} />
      <span>{likes}</span>
    </button>
  );
}

export default LikeButton;