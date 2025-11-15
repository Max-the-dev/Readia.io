import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import ConnectPromptHero, { dashboardHighlights } from '../components/ConnectPromptHero';
import AppKitConnectButton from '../components/AppKitConnectButton';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Eye,
  Users,
  Edit3,
  LayoutDashboard,
  Search,
  Filter,
  X,
  Book,
  Trash2,
  Edit,
  FileText,
  Clock,
  CheckCircle,
  Send,
  WalletMinimal,
  ShieldCheck,
  Copy,
  Check,
  Plus,
} from 'lucide-react';
import { isDateWithinRange, getRelativeTimeString } from '../utils/dateUtils';
import { extractPlainText } from '../utils/htmlUtils';
import {
  apiService,
  Article,
  Author,
  Draft,
  CreateArticleRequest,
  SupportedAuthorNetwork,
} from '../services/api';
import { PublicKey } from '@solana/web3.js';
import { isAddress as isEvmAddress } from 'viem';
import { getEnsName } from 'viem/actions';
import { useNetworkIconByCaipId } from '../hooks/useNetworkAssets';
import { NETWORK_FAMILY_DEFAULTS, NETWORK_FALLBACK_ICONS } from '../constants/networks';


type NetworkFamily = 'base' | 'solana';

const truncateAddress = (value?: string | null) => {
  if (!value) return '—';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
};

const networkSwatches: Record<NetworkFamily, { label: string; color: string }> = {
  base: { label: 'Base', color: '#2563eb' },
  solana: { label: 'Solana', color: '#16a34a' },
};

const getNetworkFamily = (network?: SupportedAuthorNetwork | null): NetworkFamily => {
  if (!network) return 'base';
  return network.includes('solana') ? 'solana' : 'base';
};

const getNetworkLabel = (family: NetworkFamily) => (family === 'solana' ? 'Solana' : 'Base');

const normalizeWalletForComparison = (value?: string | null): string | null => {
  if (!value) return null;
  if (value.startsWith('0x')) {
    return value.toLowerCase();
  }
  return value;
};


function Dashboard() {
  const { isConnected, isConnecting, address, balance, disconnect } = useWallet();
  const navigate = useNavigate();

  // Available categories (must match backend validation schema)
  const availableCategories = [
    // Tech (5)
    'Technology',
    'AI & Machine Learning',
    'Web Development',
    'Crypto & Blockchain',
    'Security',
    // Business (4)
    'Business',
    'Startup',
    'Finance',
    'Marketing',
    // General Topics (11)
    'Science',
    'Health',
    'Education',
    'Politics',
    'Sports',
    'Entertainment',
    'Gaming',
    'Art & Design',
    'Travel',
    'Food',
    'Other'
  ];

  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; article: Article | null }>({ show: false, article: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [articleError, setArticleError] = useState<string>('');
  const [authorError, setAuthorError] = useState<string>('');
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftsError, setDraftsError] = useState('');
  const [draftConfirmDelete, setDraftConfirmDelete] = useState<Draft | null>(null);
  const [draftConfirmPublish, setDraftConfirmPublish] = useState<Draft | null>(null);
  const [isDeletingDraft, setIsDeletingDraft] = useState(false);
  const [isPublishingDraft, setIsPublishingDraft] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState<'primary' | 'secondary' | null>(null);
  const [purchases7d, setPurchases7d] = useState(0);
  const [secondaryAddressInput, setSecondaryAddressInput] = useState('');
  const [payoutStatus, setPayoutStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingPayout, setIsSavingPayout] = useState(false);
  const [secondaryAddressError, setSecondaryAddressError] = useState('');
  const [isRemovingPayout, setIsRemovingPayout] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<
    | null
    | {
        type: 'remove' | 'replace';
        payload?: { newAddress?: string; previousAddress?: string };
      }
  >(null);

  const openWalletModal = () => {
    setShowWalletModal(true);
  };

  const closeWalletModal = () => {
    setShowWalletModal(false);
    resetSecondaryForm(); //existing helper later in the file
  }
  
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date'); // date, title, price, earnings, views
  const [dateFilter, setDateFilter] = useState('all'); // all, week, month, quarter
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, or specific category

  // Fetch articles and author data on component mount and when address changes
  useEffect(() => {
    if (isConnected && address) {
      fetchArticles();
      fetchAuthor();
      fetchPurchaseStats();
    } else {
      setArticles([]);
      setAuthor(null);
      setPurchases7d(0);
      setLoading(false);
    }
  }, [isConnected, address]);

  const fetchArticles = async () => {
    if (!address) return;
    
    setLoading(true);
    setArticleError('');
    
    try {
      const response = await apiService.getArticles({ 
        authorAddress: address,
        search: searchTerm,
        sortBy: sortBy as any,
        sortOrder: 'desc' // Always descending for dashboard
      });
      
      if (response.success && response.data) {
        setArticles(response.data);
        setArticleError('');
      } else {
        // API returned error response - show specific error
        const friendlyError = response.error === 'Failed to fetch'
          ? 'Failed to fetch articles'
          : response.error;
        setArticleError(friendlyError || 'An unexpected error occurred');
      }
    } catch (err) {
      // Network error or exception - show generic message
      if (err instanceof Error && err.message && err.message !== 'Failed to fetch') {
        setArticleError(err.message);
      } else {
        setArticleError('Failed to fetch articles');
      }
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthor = async () => {
    if (!address) return;
    
    try {
      const response = await apiService.getAuthor(address);
      if (response.success && response.data) {
        setAuthor(response.data);
        setAuthorError('');
      } else {
        const friendlyError = response.error === 'Failed to fetch'
          ? 'Failed to fetch author stats'
          : response.error;
        setAuthorError(prev => prev || friendlyError || 'Failed to fetch author stats');
      }
    } catch (err) {
      const fallbackMessage = err instanceof Error && err.message && err.message !== 'Failed to fetch'
        ? err.message
        : 'Failed to fetch author stats';
      setAuthorError(prev => prev || fallbackMessage);
      console.error('Error fetching author:', err);
    }
  };

  const fetchPurchaseStats = async () => {
    if (!address) return;

    try {
      const response = await apiService.getAuthorPurchaseStats(address);
      if (response.success && response.data) {
        setPurchases7d(response.data.purchases7d);
      }
    } catch (error) {
      console.error('Error fetching purchase stats:', error);
    }
  };


  const loadDraftsForModal = async () => {
    if (!address) return;

    setDraftsLoading(true);
    setDraftsError('');

    try {
      const response = await apiService.getDrafts(address);
      if (response.success && response.data) {
        setDrafts(response.data);
      } else {
        setDrafts([]);
        setDraftsError(response.error || 'Failed to load drafts');
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Failed to load drafts';
      setDrafts([]);
      setDraftsError(message);
      console.error('Error fetching drafts:', err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const openDraftsModal = async () => {
    if (!address) return;
    setShowDraftsModal(true);
    await loadDraftsForModal();
  };

  const closeDraftsModal = () => {
    setShowDraftsModal(false);
    setDraftsError('');
    setDraftConfirmDelete(null);
    setDraftConfirmPublish(null);
  };

  const handleDraftEdit = (draft: Draft) => {
    setShowDraftsModal(false);
    navigate(`/write?draftId=${draft.id}`);
  };

  const handleDraftPublish = (draft: Draft) => {
    setDraftsError('');
    setDraftConfirmPublish(draft);
  };

  const handleDraftDelete = async (draft: Draft) => {
    if (!address) return;

    setDraftsError('');
    setDraftConfirmDelete(draft);
  };

  const getDraftPreview = (html: string) => extractPlainText(html, 120, 'No content yet');

  const handleConfirmDraftDelete = async () => {
    if (!address || !draftConfirmDelete) return;

    setIsDeletingDraft(true);
    try {
      const response = await apiService.deleteDraft(draftConfirmDelete.id, address);
      if (response.success) {
        setDrafts(prev => prev.filter(d => d.id !== draftConfirmDelete.id));
        setDraftsError('');
        setDraftConfirmDelete(null);
      } else {
        setDraftsError(response.error || 'Failed to delete draft');
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Failed to delete draft';
      setDraftsError(message);
      console.error('Error deleting draft:', err);
    } finally {
      setIsDeletingDraft(false);
    }
  };

  const publishDraft = async () => {
    if (!address || !draftConfirmPublish) return;

    setIsPublishingDraft(true);
    setDraftsError('');

    const draft = draftConfirmPublish;
    const articlePayload: CreateArticleRequest = {
      title: draft.title || '',
      content: draft.content || '',
      price: draft.price || 0,
      authorAddress: address,
      categories: [],
      draftId: draft.id,
    };

    try {
      const validationResponse = await apiService.validateArticle(articlePayload);
      if (!validationResponse.success) {
        const combined = [validationResponse.error, validationResponse.message]
          .filter(Boolean)
          .join('\n');
        setDraftsError(combined || 'Draft failed validation');
        setDraftConfirmPublish(null);
        return;
      }

      const publishResponse = await apiService.createArticle(articlePayload);
      if (publishResponse.success) {
        setDrafts(prev => prev.filter(d => d.id !== draft.id));
        setDraftConfirmPublish(null);
        fetchArticles();
        fetchAuthor();
      } else {
        const message = publishResponse.error || 'Failed to publish draft';
        const details = (publishResponse as any).details;
        if (details && Array.isArray(details)) {
          const formatted = details.map((d: any) => `${d.field}: ${d.message}`).join('\n');
          setDraftsError(`${message}\n${formatted}`);
        } else {
          setDraftsError(message);
        }
        setDraftConfirmPublish(null);
      }
    } catch (err) {
      console.error('Error publishing draft:', err);
      const message = err instanceof Error && err.message ? err.message : 'Failed to publish draft';
      setDraftsError(message);
      setDraftConfirmPublish(null);
    } finally {
      setIsPublishingDraft(false);
    }
  };

  // Delete article handler
  const handleDeleteArticle = async (article: Article) => {
    if (!address) return;
    
    setIsDeleting(true);
    try {
      const response = await apiService.deleteArticle(article.id, address);
      if (response.success) {
        // Remove article from local state
        setArticles(prev => prev.filter(a => a.id !== article.id));
        setDeleteConfirm({ show: false, article: null });
        // Refresh author data to ensure lifetime totals are current
        fetchAuthor();
        // Show success message or notification here if needed
      } else {
        setArticleError(response.error || 'Failed to delete article');
      }
    } catch (err) {
      setArticleError('An unexpected error occurred while deleting');
      console.error('Error deleting article:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Refetch when search/sort changes
  useEffect(() => {
    if (isConnected && address) {
      const timeoutId = setTimeout(() => {
        fetchArticles();
      }, 300); // Debounce search
      
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, sortBy]);

  // Filter articles by date and category (client-side filtering)
  const filteredArticles = articles.filter(article => {
    // Date filter
    if (dateFilter !== 'all') {
      if (!isDateWithinRange(article.publishDate, dateFilter as 'week' | 'month' | 'quarter')) {
        return false;
      }
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      if (!article.categories || !article.categories.includes(categoryFilter)) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate stats from author data (lifetime totals)
  const stats = {
    totalEarnings: author?.totalEarnings || 0,
    totalArticles: author?.totalArticles || 0,
    totalViews: author?.totalViews || 0,
    totalPurchases: author?.totalPurchases || 0,
    avgEarningsPerArticle: (author?.totalArticles || 0) > 0 
      ? (author?.totalEarnings || 0) / (author?.totalArticles || 0)
      : 0,
  };

  const primaryNetworkFamily = getNetworkFamily(author?.primaryPayoutNetwork);
  const secondaryWalletExists = Boolean(author?.secondaryPayoutAddress && author?.secondaryPayoutNetwork);
  const complementaryNetworkFamily: NetworkFamily = primaryNetworkFamily === 'solana' ? 'base' : 'solana';
  const secondaryNetworkApiValue: SupportedAuthorNetwork =
    complementaryNetworkFamily === 'solana' ? 'solana' : 'base';
  const secondaryDisplayFamily: NetworkFamily = secondaryWalletExists
    ? getNetworkFamily(author?.secondaryPayoutNetwork)
    : complementaryNetworkFamily;
  const primaryNetworkCaipId = NETWORK_FAMILY_DEFAULTS[primaryNetworkFamily];
  const secondaryNetworkCaipId = NETWORK_FAMILY_DEFAULTS[secondaryDisplayFamily];
  const primaryNetworkIcon = useNetworkIconByCaipId(
    primaryNetworkCaipId,
    NETWORK_FALLBACK_ICONS[primaryNetworkCaipId]
  );
  const secondaryNetworkIcon = useNetworkIconByCaipId(
    secondaryNetworkCaipId,
    NETWORK_FALLBACK_ICONS[secondaryNetworkCaipId]
  );

  const validateSecondaryAddress = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Address is required.';
    }
    if (complementaryNetworkFamily === 'base') {
      if (!isEvmAddress(trimmed)) {
        return 'Enter a valid Base (EVM) address.';
      }
    } else {
      try {
        new PublicKey(trimmed);
      } catch {
        return 'Enter a valid Solana address.';
      }
    }
    return '';
  };

  const handleSaveSecondaryPayout = async () => {
    if (!address) {
      setPayoutStatus({ type: 'error', message: 'Connect your wallet to add a payout method.' });
      return;
    }

    const trimmed = secondaryAddressInput.trim();
    const validationError = validateSecondaryAddress(trimmed);
    if (validationError) {
      setSecondaryAddressError(validationError);
      setPayoutStatus(null);
      return;
    }
    setSecondaryAddressError('');

    setIsSavingPayout(true);
    setPayoutStatus(null);

    try {
      const response = await apiService.addSecondaryPayoutMethod(address, {
        network: secondaryNetworkApiValue,
        payoutAddress: trimmed,
      });

      if (response.success && response.data) {
        setAuthor(response.data);
        reconcileWalletSession(response.data);
        setSecondaryAddressInput('');
        setPayoutStatus({ type: 'success', message: 'Secondary wallet saved.' });
      } else {
        setPayoutStatus({ type: 'error', message: response.error || 'Failed to save payout method.' });
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to save payout method.';
      if (message.toLowerCase().includes('already linked')) {
        setPayoutStatus({
          type: 'error',
          message: 'This wallet is already linked to another profile. Contact support to merge accounts.',
        });
      } else if (message.toLowerCase().includes('network already configured')) {
        setPayoutStatus({
          type: 'error',
          message: 'You already have a wallet on this network. Remove it before adding another.',
        });
      } else {
        setPayoutStatus({
          type: 'error',
          message,
        });
      }

      // If the backend returned a validation-style error, surface it near the input
      const backendAddressError =
        message.includes('valid Base') || message.includes('valid Solana') ? message : '';
      if (backendAddressError) {
        setSecondaryAddressError(backendAddressError);
      }
    } finally {
      setIsSavingPayout(false);
    }
  };

  const canSaveSecondary =
    !secondaryAddressError && secondaryAddressInput.trim().length > 0;

  const handleRemoveSecondaryPayout = async () => {
    if (!address || !author?.secondaryPayoutNetwork) return;

    setIsRemovingPayout(true);
    setPayoutStatus(null);

    try {
      const response = await apiService.removeSecondaryPayoutMethod(
        address,
        author.secondaryPayoutNetwork
      );

      if (response.success && response.data) {
        setAuthor(response.data);
        reconcileWalletSession(response.data);
        setSecondaryAddressInput('');
        setSecondaryAddressError('');
        setPayoutStatus({
          type: 'success',
          message: 'Secondary wallet removed.',
        });
      } else {
        setPayoutStatus({
          type: 'error',
          message: response.error || 'Failed to remove secondary wallet.',
        });
      }
    } catch (error) {
      setPayoutStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Failed to remove secondary wallet.',
      });
    } finally {
      setIsRemovingPayout(false);
    }
  };

  const handleCopyWallet = (value?: string | null, type: 'primary' | 'secondary') => {
    if (!value) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value).then(() => {
        setCopiedAddress(type);
        setTimeout(() => setCopiedAddress(null), 1500);
      });
    }
  };

  const resetSecondaryForm = () => {
    setSecondaryAddressInput(author?.secondaryPayoutAddress || '');
    setSecondaryAddressError('');
    setPayoutStatus(null);
  };

  const clearSecondaryInput = () => {
    setSecondaryAddressInput('');
    setSecondaryAddressError('');
    setPayoutStatus(null);
  };

  const handleCloseWalletModal = () => {
    setShowWalletModal(false);
    resetSecondaryForm();
    setCopiedAddress(null);
  };

  const requestPayoutChange = (
    type: 'remove' | 'replace',
    payload?: { newAddress?: string }
  ) => {
    setPendingConfirmation({ type, payload });
    setShowPayoutConfirm(true);
  };

  const handleSecondarySubmitRequest = () => {
    const trimmed = secondaryAddressInput.trim();
    const validationError = validateSecondaryAddress(trimmed);
    if (validationError) {
      setSecondaryAddressError(validationError);
      setPayoutStatus(null);
      return;
    }
    setSecondaryAddressError('');
    requestPayoutChange('replace');
  };

  const handleConfirmPayoutChange = async () => {
    if (!pendingConfirmation) return;

    setShowPayoutConfirm(false);

    if (pendingConfirmation.type === 'replace') {
      await handleSaveSecondaryPayout();
    } else if (pendingConfirmation.type === 'remove') {
      await handleRemoveSecondaryPayout();
    }
  };

  const reconcileWalletSession = (nextAuthor: Author) => {
    const connected = normalizeWalletForComparison(address);
    const primary = normalizeWalletForComparison(nextAuthor.address);
    const secondary = normalizeWalletForComparison(nextAuthor.secondaryPayoutAddress);

    if (!connected) return;

    const stillLinked = connected === primary || connected === secondary;

    if (!stillLinked) {
      // User was connected with the removed secondary; force them to reconnect 
      disconnect();
      setShowWalletModal(false);
      setPayoutStatus({
        type: 'error',
        message: 'Secondary wallet removed. Reconnect with your primary wallet to continue.',
      });
    }
  };

  // Clear search and filters function
  const clearSearch = () => {
    setSearchTerm('');
    setSortBy('date');
    setDateFilter('all');
    setCategoryFilter('all');
    setShowFilters(false);
    setArticleError('');
  };

  const error = articleError || authorError;

  if (!isConnected && !isConnecting) {
    return (
      <div className="connect-state connect-state--full">
        <ConnectPromptHero
          title="Connect your wallet"
          description="A single screen view for everything that matters—review your metrics, manage your articles, and control your wallets."
          highlights={dashboardHighlights}
        />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="container">
        <div className="dashboard-header">
          <h1>
            <LayoutDashboard size={25} /> Writer Dashboard
          </h1>
          {author && (
            <div className="wallet-summary" role="region" aria-label="Wallet summary">
              <div className="wallet-summary-trigger-wrapper">
                <button
                  type="button"
                  className={`plusButton wallet-summary-trigger${
                    secondaryWalletExists ? ' has-secondary' : ''
                  }`}
                  onClick={openWalletModal}
                  aria-label={secondaryWalletExists ? 'Manage payout wallets' : 'Add secondary wallet'}
                  title={secondaryWalletExists ? 'Manage payout wallets' : 'Add secondary wallet'}
                >
                  {secondaryWalletExists ? (
                    <WalletMinimal className="plusIcon" aria-hidden="true" />
                  ) : (
                    <Plus className="plusIcon" aria-hidden="true" />
                  )}
                  <span className="sr-only">
                    {secondaryWalletExists
                      ? 'Open wallet management modal'
                      : 'Add a secondary wallet'}
                  </span>
                </button>
              </div>

              <div className="wallet-summary-lines">
                <p className="wallet-summary-line">
                  <span className="wallet-summary-label">Primary wallet:</span>
                  <span className="wallet-summary-value">
                    {truncateAddress(author.address || address)}
                  </span>
                </p>

                {author.secondaryPayoutAddress && (
                  <p className="wallet-summary-line">
                    <span className="wallet-summary-label">Secondary wallet:</span>
                    <span className="wallet-summary-value">
                      {truncateAddress(author.secondaryPayoutAddress)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Main Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card primary">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Earnings</h3>
              <p className="stat-value">${stats.totalEarnings.toFixed(2)}</p>
              <span className="stat-change">From {stats.totalArticles} articles</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Edit3 size={24} />
            </div>
            <div className="stat-content">
              <h3>Articles Published</h3>
              <p className="stat-value">{stats.totalArticles}</p>
              <span className="stat-change">Avg. ${stats.avgEarningsPerArticle.toFixed(2)} per article</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Eye size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Views</h3>
              <p className="stat-value">{stats.totalViews.toLocaleString()}</p>
              <span className="stat-change"> Rate: {stats.totalViews > 0 ? ((stats.totalPurchases / stats.totalViews) * 100).toFixed(1) : '0'}%</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Purchases</h3>
              <p className="stat-value">{stats.totalPurchases}</p>
              <span className="stat-change">This week: {purchases7d}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
            <button onClick={fetchArticles} className="retry-btn">Try Again</button>
          </div>
        )}

        {/* Articles List */}
        <div className="articles-section">
          <div className="articles-header">
            <h2><Book size={20} />Your Articles</h2>
            <div className="articles-header-actions">
              <button
                type="button"
                onClick={openDraftsModal}
                className="view-drafts-btn"
                disabled={draftsLoading && showDraftsModal}
              >
                <span className="top-key"></span>
                <span className="button-text">
                  <FileText size={18} />
                  {draftsLoading && showDraftsModal ? 'Loading Drafts...' : 'View Drafts'}
                </span>
                <span className="bottom-key-1"></span>
                <span className="bottom-key-2"></span>
              </button>
              <Link to="/write" className="write-new-btn">
                <span className="top-key"></span>
                <span className="button-text">
                  <Edit3 size={18} />
                  Write New Article
                </span>
                <span className="bottom-key-1"></span>
                <span className="bottom-key-2"></span>
              </Link>
            </div>
          </div>
          
          {/* Search and Filter Controls */}
          <div className="articles-controls">
            <div className="search-container">
              <div className="search-icon-section">
                <Search size={18} />
              </div>
              <div className="search-input-wrapper">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your articles..."
                  className="search-input"
                />
                {searchTerm && (
                  <button 
                    className="clear-search-btn"
                    onClick={clearSearch}
                    title="Clear search"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
            <div className="filter-container">
              <button 
                className={`filter-button ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={14} />
                
              </button>
            </div>
          </div>

          {/* Filter Dropdown */}
          {showFilters && (
            <div className="filter-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Sort by:</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="date">Latest First</option>
                    <option value="title">Title A-Z</option>
                    <option value="price">Price (High to Low)</option>
                    <option value="earnings">Earnings (High to Low)</option>
                    <option value="views">Most Viewed</option>
                  </select>
                </div>
                
                <div className="filter-group">
                  <label>Date range:</label>
                  <select 
                    value={dateFilter} 
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All time</option>
                    <option value="week">Last week</option>
                    <option value="month">Last month</option>
                    <option value="quarter">Last 3 months</option>
                  </select>
                </div>

                <div className="filter-group">
                  <label>Category:</label>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Categories</option>
                    {availableCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                
                <div className="filter-separator"></div>
                
                <div className="filter-group" style={{minWidth: 'auto'}}>
                  <button 
                    className="clear-filters-btn"
                    onClick={clearSearch}
                    style={{marginTop: 'auto'}}
                  >
                    Clear all
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <div className="articles-table">
            <div className="table-header">
              <div className="table-cell">Article</div>
              <div className="table-cell">Published</div>
              <div className="table-cell">Price</div>
              <div className="table-cell">Views</div>
              <div className="table-cell">Readers</div>
              <div className="table-cell">Earnings</div>
              <div className="table-cell">Rate</div>
              <div className="table-cell">Actions</div>
            </div>

            <div className="articles-table-scroll">
            {loading ? (
              <div className="loading-state">
                <p>Loading your articles...</p>
              </div>
            ) : filteredArticles.length > 0 ? (
              filteredArticles.map((article) => (
                <div key={article.id} className="table-row">
                  <div className="table-cell article-info">
                    <Link to={`/article/${article.id}`} className="article-title-link">
                      <div className="article-title">{article.title}</div>
                    </Link>
                  </div>
                  <div className="table-cell">
                    <div className="date-info">
                      <div className="date-primary">{new Date(article.publishDate).toLocaleDateString()}</div>
                      <div className="date-relative">{getRelativeTimeString(article.publishDate)}</div>
                    </div>
                  </div>
                  <div className="table-cell">
                    ${article.price.toFixed(2)}
                  </div>
                  <div className="table-cell">
                    {article.views.toLocaleString()}
                  </div>
                  <div className="table-cell">
                    {article.purchases}
                  </div>
                  <div className="table-cell earnings">
                    ${article.earnings.toFixed(2)}
                  </div>
                  <div className="table-cell">
                    {/* Calculate conversion rate. Display 0 if none */}
                    {article.views > 0 ? ((article.purchases / article.views) * 100).toFixed(1) : '0'}%
                  </div>
                  <div className="table-cell actions">
                    <Link to={`/edit/${article.id}`} className="action-btn edit-btn" title="Edit article">
                      <Edit />
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm({ show: true, article })}
                      className="action-btn delete-btn"
                      title="Delete article"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-results">
                <div className="no-results-content">
                  <Search size={48} />
                  <h3>No articles found</h3>
                  <p>Try adjusting your search terms or filters</p>
                  {(searchTerm || dateFilter !== 'all' || categoryFilter !== 'all') && (
                    <button 
                      className="clear-filters-btn"
                      onClick={clearSearch}
                    >
                      Clear search and filters
                    </button>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      {showDraftsModal && (
        <div className="modal-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDraftsModal();
            }
          }}
          >
          <div className="drafts-modal" 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="drafts-modal-title"
            onClick={(event) => event.stopPropagation()}
          
          >
            <div className="drafts-modal-header">
              <h3 id="drafts-modal-title">Saved Drafts</h3>
              <button 
                type="button"
                onClick={closeDraftsModal}
                className="close-btn"
                aria-label="Close drafts modal"
              >
                ×
              </button>
            </div>
            <p className="drafts-modal-subtitle">Access drafts saved from the editor. Drafts automatically expire after 7 days.</p>
            <div className="drafts-modal-content">
              {draftsLoading ? (
                <div className="drafts-modal-loading">Loading drafts...</div>
              ) : draftsError ? (
                <div className="drafts-modal-error">❌ {draftsError}</div>
              ) : drafts.length === 0 ? (
                <div className="drafts-modal-empty">
                  <FileText size={36} />
                  <p>No drafts available</p>
                  <span>Drafts you save from the editor will appear here.</span>
                </div>
              ) : (
                <div className="drafts-list">
                  {drafts.map(draft => (
                    <div key={draft.id} className="drafts-item">
                      <div className="drafts-item-main">
                        <h4>{draft.title || 'Untitled Draft'}</h4>
                        <p className="drafts-item-preview">{getDraftPreview(draft.content)}</p>
                        <div className="drafts-item-meta">
                          <span className={`draft-pill ${draft.isAutoSave ? 'auto' : 'manual'}`}>
                            {draft.isAutoSave ? 'Auto-save' : 'Manual save'}
                          </span>
                          <span className="drafts-item-meta-entry">
                            <Clock size={14} />
                            Updated {getRelativeTimeString(draft.updatedAt)}
                          </span>
                          <span className="drafts-item-meta-entry price">
                            ${draft.price.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="drafts-item-actions">
                        <div
                          className="table-cell actions"
                          role="group"
                          aria-label="Draft quick actions"
                        >
                          <button
                            type="button"
                            className="action-btn edit-btn"
                            onClick={() => handleDraftEdit(draft)}
                            disabled={isPublishingDraft || isDeletingDraft}
                            aria-label="Edit draft"
                            title="Edit draft"
                          >
                            <Edit aria-hidden="true" />
                            <span className="sr-only">Edit draft</span>
                          </button>
                          <button
                            type="button"
                            className="action-btn publish-action-btn"
                            onClick={() => handleDraftPublish(draft)}
                            disabled={isPublishingDraft}
                            aria-label={
                              isPublishingDraft && draftConfirmPublish?.id === draft.id
                                ? 'Publishing draft'
                                : 'Publish draft'
                            }
                            title={
                              isPublishingDraft && draftConfirmPublish?.id === draft.id
                                ? 'Publishing draft'
                                : 'Publish draft'
                            }
                          >
                            <Send aria-hidden="true" />
                            <span className="sr-only">
                              {isPublishingDraft && draftConfirmPublish?.id === draft.id
                                ? 'Publishing draft'
                                : 'Publish draft'}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() => handleDraftDelete(draft)}
                            disabled={isDeletingDraft && draftConfirmDelete?.id === draft.id}
                            aria-label={isDeletingDraft && draftConfirmDelete?.id === draft.id ? 'Deleting draft' : 'Delete draft'}
                            title="Delete draft"
                          >
                            <Trash2 aria-hidden="true" />
                            <span className="sr-only">
                              {isDeletingDraft && draftConfirmDelete?.id === draft.id ? 'Deleting draft' : 'Delete draft'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {draftConfirmDelete && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Delete Draft</h3>
            <p>Are you sure you want to delete "<strong>{draftConfirmDelete.title || 'Untitled Draft'}</strong>"?</p>
            <p className="warning-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button
                onClick={() => setDraftConfirmDelete(null)}
                className="secondary-btn"
                disabled={isDeletingDraft}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDraftDelete}
                className="delete-confirm-btn"
                disabled={isDeletingDraft}
              >
                {isDeletingDraft ? 'Deleting…' : 'Delete Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {draftConfirmPublish && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h3>Publish Draft</h3>
            <p>Publish "<strong>{draftConfirmPublish.title || 'Untitled Draft'}</strong>" for your readers?</p>
            <p className="confirm-message">We’ll run the standard validation checks before it goes live.</p>
            <div className="modal-actions">
              <button
                onClick={() => setDraftConfirmPublish(null)}
                className="secondary-btn"
                disabled={isPublishingDraft}
              >
                Cancel
              </button>
              <button
                onClick={publishDraft}
                className="action-btn publish-btn"
                disabled={isPublishingDraft}
              >
                {isPublishingDraft ? 'Publishing…' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
        {deleteConfirm.show && deleteConfirm.article && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <h3>Delete Article</h3>
              <p>Are you sure you want to delete "<strong>{deleteConfirm.article.title}</strong>"?</p>
              <p className="warning-text">This action cannot be undone.</p>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setDeleteConfirm({ show: false, article: null })}
                  className="secondary-btn"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteArticle(deleteConfirm.article!)}
                  className="delete-confirm-btn"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Article'}
                </button>
              </div>
            </div>
          </div>
        )}

      {showWalletModal && (
        <div
          className="modal-overlay wallet-lab-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseWalletModal();
            }
          }}
        >
          <div
            className="wallet-lab__surface wallet-lab__surface--modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="wallet-lab__close"
              onClick={handleCloseWalletModal}
              aria-label="Close wallet management modal"
            >
              ×
            </button>
            <header className="wallet-lab__header">
              <div>
                <p className="wallet-lab__eyebrow">Wallet Management</p>
                <h1>More ways to get paid</h1>
                <p>Keep a primary {getNetworkLabel(primaryNetworkFamily)} wallet and accept payments on {getNetworkLabel(complementaryNetworkFamily)}.</p>
              </div>
            </header>

            <div className="wallet-lab__grid">
              <div className="wallet-lab__cards">
                <article className="wallet-card wallet-card--primary">
                  <div className="wallet-card__status-badge">Connected</div>
                  <div className={`wallet-card__badge wallet-card__badge--${primaryNetworkFamily}`}>
                    {primaryNetworkIcon ? (
                      <img
                        src={primaryNetworkIcon}
                        alt={`${getNetworkLabel(primaryNetworkFamily)} network`}
                      />
                    ) : (
                      <span>{networkSwatches[primaryNetworkFamily].label}</span>
                    )}
                  </div>
                  <h3>Primary wallet</h3>
                  <div className="wallet-card__content">
                    <p className="wallet-card__address">
                      {truncateAddress(author?.address || address)}
                    </p>
                    <div className="wallet-card__actions">
                      <button
                        type="button"
                        className="wallet-card__ghost"
                        onClick={() => handleCopyWallet(author?.address || address, 'primary')}
                      >
                        <Copy size={14} />
                        {copiedAddress === 'primary' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </article>

                <article className="wallet-card wallet-card--secondary">
                  {secondaryWalletExists && (
                    <div className="wallet-card__status-badge">Connected</div>
                  )}
                  <div className={`wallet-card__badge wallet-card__badge--${secondaryDisplayFamily}`}>
                    {secondaryNetworkIcon ? (
                      <img
                        src={secondaryNetworkIcon}
                        alt={`${getNetworkLabel(secondaryDisplayFamily)} network`}
                      />
                    ) : (
                      <span>{networkSwatches[secondaryDisplayFamily].label}</span>
                    )}
                  </div>
                  <h3>Secondary wallet</h3>
                  {secondaryWalletExists ? (
                    <>
                      <div className="wallet-card__content">
                        <p className="wallet-card__address">
                          {truncateAddress(author?.secondaryPayoutAddress)}
                        </p>
                        <div className="wallet-card__actions">
                          <button
                            type="button"
                            className="wallet-card__ghost"
                            onClick={() => handleCopyWallet(author?.secondaryPayoutAddress, 'secondary')}
                          >
                            <Copy size={14} />
                            {copiedAddress === 'secondary' ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            className="wallet-card__ghost"
                            onClickCapture={() => requestPayoutChange('remove')}
                            disabled={isRemovingPayout}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="wallet-card__placeholder">
                      <WalletMinimal size={20} />
                      <span>Add a Solana payout address</span>
                    </div>
                  )}
                </article>
              </div>

                <div className="wallet-lab__form">
                  <div className="wallet-lab__form-head">
                    <WalletMinimal size={18} />
                  <div>
                    <h4>Add a {getNetworkLabel(complementaryNetworkFamily)} wallet</h4>
                    <p>More networks coming soon</p>
                  </div>
                </div>
                <label>
                  {getNetworkLabel(complementaryNetworkFamily)} address
                  <input
                    type="text"
                    placeholder={`Enter ${getNetworkLabel(complementaryNetworkFamily)} wallet address`}
                    value={secondaryAddressInput}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setSecondaryAddressInput(nextValue);
                      if (secondaryAddressError) {
                        setSecondaryAddressError(validateSecondaryAddress(nextValue));
                      }
                    }}
                  />
                </label>
                {secondaryAddressError && (
                  <p className="wallet-lab__error">{secondaryAddressError}</p>
                )}
                {payoutStatus && (
                  <div className={`wallet-lab__status wallet-lab__status--${payoutStatus.type}`}>
                    <ShieldCheck size={16} />
                    <span>{payoutStatus.message}</span>
                  </div>
                )}
                <div className="wallet-lab__form-actions">
                  <button
                    type="button"
                    className="wallet-lab__primary"
                    onClick={handleSecondarySubmitRequest}
                    disabled={isSavingPayout || !canSaveSecondary}
                  >
                    {isSavingPayout ? 'Saving…' : 'Submit'}
                  </button>
                  <button
                    type="button"
                    className="wallet-lab__ghost"
                    onClick={clearSecondaryInput}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>
          {showPayoutConfirm && pendingConfirmation && (
        <div className="modal-overlay payout-confirm-overlay">
          <div className="payout-confirm">
            <h3>Confirm wallet change</h3>
            <p>
              Make sure you still have access to your primary wallet. Removing or replacing
              the secondary payout method will sign you out.
            </p>
            <div className="payout-confirm__actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowPayoutConfirm(false);
                  setPendingConfirmation(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleConfirmPayoutChange}
              >
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
        
      )}
    </div>
  );
}

export default Dashboard;
