import { useState, useEffect, useRef, useCallback, FormEvent, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import ConnectPromptHero, { writeHighlights } from '../components/ConnectPromptHero';
import {
  Save,
  Send,
  FileText,
  Clock,
  Eye,
  LayoutDashboard,
  PenTool,
  CheckCircle,
  X,
  AlertTriangle,
  Loader2,
  Check,
  Dot,
  ChevronDown,
  Search,
  Share2,
  Copy,
  Edit,
  Trash2,
  WalletMinimal,
} from 'lucide-react';
import { apiService, Draft, CreateArticleRequest } from '../services/api';
import { Editor } from '@tinymce/tinymce-react';
import { extractPlainText } from '../utils/htmlUtils';

function Write() {
  const { isConnected, isConnecting, address } = useWallet();
  const { login, isAuthenticated, isAuthenticating, error: authError, handleAuthError } = useAuth();
  const location = useLocation();

  // Category emojis for visual enhancement
  const categoryEmojis: Record<string, string> = {
    'Technology': '⚡',
    'AI & Machine Learning': '🤖',
    'Web Development': '💻',
    'Crypto & Blockchain': '🔗',
    'Security': '🔒',
    'Business': '💼',
    'Startup': '🚀',
    'Finance': '📈',
    'Marketing': '📣',
    'Science': '🔬',
    'Health': '🏥',
    'Education': '📚',
    'Politics': '🏛️',
    'Sports': '⚽',
    'Entertainment': '🎬',
    'Gaming': '🎮',
    'Art & Design': '🎨',
    'Travel': '✈️',
    'Food': '🍕',
    'Other': '📌'
  };

  // Category groups for organized dropdown
  const categoryGroups = {
    'Tech': ['Technology', 'AI & Machine Learning', 'Web Development', 'Crypto & Blockchain', 'Security'],
    'Business': ['Business', 'Startup', 'Finance', 'Marketing'],
    'General': ['Science', 'Health', 'Education', 'Politics', 'Sports', 'Entertainment', 'Gaming', 'Art & Design', 'Travel', 'Food', 'Other']
  };

  // Price presets for quick selection
  const pricePresets = [0.05, 0.10, 0.25, 0.50, 1.00];

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [activeMetaTab, setActiveMetaTab] = useState<'price' | 'categories'>('price');
  const [isDraft, setIsDraft] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [showValidationSummary, setShowValidationSummary] = useState<boolean>(false);
  const [availableDrafts, setAvailableDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState<boolean>(false);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState<boolean>(false);
  const [activeDraftId, setActiveDraftId] = useState<number | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState<boolean>(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const [publishedArticleId, setPublishedArticleId] = useState<number | null>(null);
  const [publishedArticleTitle, setPublishedArticleTitle] = useState<string>('');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Content limits
  const MAX_TITLE_LENGTH = 200;
  const MIN_CONTENT_LENGTH = 50;
  const MAX_CONTENT_LENGTH = 50000; // ~12-15 pages of text
  const MAX_CATEGORIES = 5;
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false);
  const [lastAutoSaveAt, setLastAutoSaveAt] = useState<Date | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const autoSaveTimeoutRef = useRef<number | null>(null);
  const suppressSubmitClearRef = useRef<boolean>(false);
  const autoLoadKeyRef = useRef<string | null>(null);
  const handleSubmitRef = useRef<((event: FormEvent<HTMLFormElement>) => void | Promise<void>) | undefined>(undefined);
  const autoSaveControllerRef = useRef<AbortController | null>(null);

  const clearAutoSaveTimers = useCallback(() => {
    if (typingTimeoutRef.current !== null) {
      window.clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
    if (autoSaveControllerRef.current) {
      autoSaveControllerRef.current.abort();
      autoSaveControllerRef.current = null;
    }
  }, []);

  const upsertDraftInState = (draft: Draft) => {
    setAvailableDrafts(prev => {
      const others = prev.filter(existing => existing.id !== draft.id);
      return [draft, ...others];
    });
  };

  // Typing animation state
  const [displayText, setDisplayText] = useState<string>('');
  const [hasTyped, setHasTyped] = useState<boolean>(false);
  const fullText = "Your words can change the world.";

  const clearSubmitError = () => {
    if (submitError) {
      console.log('[write] Clearing submit error state');
      setSubmitError('');
    }

    if (submitSuccess && !suppressSubmitClearRef.current) {
      console.log('[write] Clearing submit success state (suppress active?', suppressSubmitClearRef.current, ')');
      setSubmitSuccess(false);
    }
  };

  // Typing animation effect
  useEffect(() => {
    if (!hasTyped && displayText.length < fullText.length) {
      const timeout = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1));
      }, 100);
      return () => clearTimeout(timeout);
    } else if (displayText.length === fullText.length && !hasTyped) {
      setHasTyped(true);
    }
  }, [displayText, hasTyped, fullText]);

  // Price management functions
  const handlePresetClick = (presetValue: number) => {
    setPrice(presetValue.toFixed(2));
    clearSubmitError();
  };

  const calculateEarnings = (priceValue: number, reads: number): string => {
    const earnings = priceValue * reads;
    return earnings.toFixed(2);
  };

  // Share functions
  const getArticleUrl = () => {
    if (!publishedArticleId) return '';
    return `${window.location.origin}/article/${publishedArticleId}`;
  };

  const getShareText = () => {
    return `Check out my Penny.io article ... ${publishedArticleTitle}`;
  };

  const shareOnX = () => {
    const url = getArticleUrl();
    const text = getShareText();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnFacebook = () => {
    const url = getArticleUrl();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnLinkedIn = () => {
    const url = getArticleUrl();
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareOnThreads = () => {
    const url = getArticleUrl();
    const text = getShareText();
    window.open(`https://threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };

  const copyArticleLink = async () => {
    const url = getArticleUrl();
    try {
      await navigator.clipboard.writeText(url);
      setShareLinkCopied(true);
      window.setTimeout(() => setShareLinkCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Category management functions
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }

      if (prev.length >= MAX_CATEGORIES) {
        return prev;
      }

      return [...prev, category];
    });
    clearSubmitError();
  };

  const removeCategory = (category: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== category));
    clearSubmitError();
  };

  // Filter categories by search query
  const getFilteredCategories = () => {
    if (!categorySearchQuery.trim()) {
      return categoryGroups;
    }

    const query = categorySearchQuery.toLowerCase();
    const filtered: Record<string, string[]> = {};

    Object.entries(categoryGroups).forEach(([groupName, categories]) => {
      const matchingCategories = categories.filter(cat =>
        cat.toLowerCase().includes(query)
      );
      if (matchingCategories.length > 0) {
        filtered[groupName] = matchingCategories;
      }
    });

    return filtered;
  };

  // Auto-save functionality
  useEffect(() => {
    if (isSubmitting) {
      clearAutoSaveTimers();
      setIsTyping(false);
      return;
    }

    if (!address || (!title && !content)) {
      setIsTyping(false);
      clearAutoSaveTimers();
      return;
    }

    if (!isAuthenticated) {
      setIsTyping(false);
      clearAutoSaveTimers();
      setIsAutoSaving(false);
      return;
    }

    clearAutoSaveTimers();
    setIsTyping(true);

    typingTimeoutRef.current = window.setTimeout(() => {
      setIsTyping(false);
      typingTimeoutRef.current = null;
      if (!isAutoSaving) {
        setLastAutoSaveAt(new Date());
      }
    }, 1000);

    autoSaveTimeoutRef.current = window.setTimeout(async () => {
      setIsAutoSaving(true);
      const controller = new AbortController();
      autoSaveControllerRef.current = controller;

      try {
        const now = new Date();
        const response = await apiService.saveDraft({
          title,
          content,
          price: parseFloat(price) || 0.05,
          authorAddress: address,
          isAutoSave: true
        }, { signal: controller.signal });

        if (response.success && response.data) {
          setActiveDraftId(response.data.id);
          upsertDraftInState(response.data);
        }
        setLastAutoSaveAt(now);
      } catch (error) {
        if ((error as any)?.name === 'AbortError') {
          // Silently ignore - this is expected when user keeps typing
          return;
        }
        console.error('Auto-save failed:', error);
      } finally {
        if (autoSaveControllerRef.current === controller) {
          autoSaveControllerRef.current = null;
        }
        setIsAutoSaving(false);
        autoSaveTimeoutRef.current = null;
      }
    }, 5000);

    return () => {
      clearAutoSaveTimers();
    };
  }, [title, content, price, address, isAutoSaving, isSubmitting, clearAutoSaveTimers, isAuthenticated]);

  // Load available drafts when connected
  useEffect(() => {
    if (address && isAuthenticated) {
      loadDrafts();
    } else if (!isAuthenticated) {
      setAvailableDrafts([]);
    }
  }, [address, isAuthenticated]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
        setCategorySearchQuery('');
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!address) {
      setSubmitError('Please connect your wallet first');
      return;
    }

    if (!isAuthenticated) {
      setSubmitError('Authenticate your wallet to publish.');
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check for validation errors
    const errors = validateForm();
    if (errors.length > 0) {
      setShowValidationSummary(true);
      setSubmitError('');
      // Scroll to top so the validation summary is immediately visible
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (submitError) {
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const priceValue = parseFloat(price);
    if (!Number.isFinite(priceValue)) {
      setSubmitError('Valid price is required');
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const articlePreview: CreateArticleRequest = {
      title,
      content,
      price: priceValue,
      authorAddress: address!,
      categories: selectedCategories,
      draftId: activeDraftId ?? undefined,
    };

    try {
      const validationResponse = await apiService.validateArticle(articlePreview);
      if (!validationResponse.success) {
        const combinedMessage = [validationResponse.error, validationResponse.message]
          .filter(Boolean)
          .join('\n');
        setSubmitError(combinedMessage || 'Article validation failed');
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate again.');
      } else {
        console.error('Article validation request failed:', error);
        const message = error instanceof Error ? error.message : 'Unable to validate article';
        setSubmitError(message);
      }
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitError('');

    // Show confirmation modal instead of publishing immediately
    setShowPublishConfirm(true);
  };

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const handlePublishConfirm = async () => {
    clearAutoSaveTimers();
    setIsSubmitting(true);
    setSubmitSuccess(false);
    setShowPublishConfirm(false);
    const draftIdToClear = activeDraftId;

    if (!isAuthenticated) {
      setSubmitError('Authenticate your wallet to publish.');
      setShowValidationSummary(true);
      setIsSubmitting(false);
      return;
    }

    try {
      const priceValue = parseFloat(price);
      if (!Number.isFinite(priceValue)) {
        setSubmitError('Valid price is required');
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const articleData: CreateArticleRequest = {
        title,
        content,
        price: priceValue,
        authorAddress: address!,
        categories: selectedCategories,
        draftId: activeDraftId ?? undefined
      };

      const response = await apiService.createArticle(articleData);

      if (response.success && response.data) {
        suppressSubmitClearRef.current = true;
        if (draftIdToClear !== null) {
          setAvailableDrafts(prev => prev.filter(d => d.id !== draftIdToClear));
        }
        setActiveDraftId(null);

        // Store published article info for success message
        setPublishedArticleId(response.data.id);
        setPublishedArticleTitle(title);

        // Clear current form
        setTitle('');
        setContent('');
        setPrice('0.05');
        setSelectedCategories([]);
        setShowValidationSummary(false);
        setSubmitError('');
        setSubmitSuccess(true);
        setLastAutoSaveAt(null);
        setIsTyping(false);
        await loadDrafts();
        console.log('[write] submitSuccess set to true');

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });

        window.setTimeout(() => {
          console.log('[write] Releasing submit success suppression flag');
          suppressSubmitClearRef.current = false;
        }, 250);
      } else {
        // Handle backend validation errors with details
        const errorMessage = response.error || 'Failed to create article';
        const details = (response as any).details;

        if (details && Array.isArray(details)) {
          // Format validation errors from backend
          const detailedErrors = details.map((d: any) => `${d.field}: ${d.message}`).join('; ');
          setSubmitError(`${errorMessage}\n${detailedErrors}`);
        } else {
          setSubmitError(errorMessage);
        }

        setShowValidationSummary(true);

        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate again.');
      } else {
        const err = error as any;
        if (err.details && Array.isArray(err.details)) {
          const detailedErrors = err.details.map((d: any) => `${d.field}: ${d.message}`).join('; ');
          setSubmitError(`Validation failed: ${detailedErrors}`);
        } else {
          setSubmitError(err.message || 'An unexpected error occurred');
        }
        console.error('Error creating article:', error);
      }

      setShowValidationSummary(true);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePreview = (content: string) => extractPlainText(content, 300);

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const textContent = extractPlainText(content);
    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
    return `${minutes} min read`;
  };

  // Field validation helper for summary
  const getFieldErrorRaw = (field: 'title' | 'content' | 'price'): string | null => {
    switch (field) {
      case 'title':
        if (!title.trim()) return 'Title is required';
        if (title.length > MAX_TITLE_LENGTH) return `Title must be ${MAX_TITLE_LENGTH} characters or less`;
        return null;

      case 'content':
        if (!content.trim()) return 'Content is required';
        const textContent = content.replace(/<[^>]*>/g, '').trim();
        if (textContent.length < MIN_CONTENT_LENGTH) return `Content must be at least ${MIN_CONTENT_LENGTH} characters`;
        if (content.length > MAX_CONTENT_LENGTH) return `Content must be ${MAX_CONTENT_LENGTH.toLocaleString()} characters or less`;
        return null;

      case 'price':
        if (!price || parseFloat(price) <= 0) return 'Valid price is required';
        const priceNum = parseFloat(price);
        if (priceNum < 0.01) return 'Price must be at least $0.01';
        if (priceNum > 1.00) return 'Price cannot exceed $1.00';
        return null;

      default:
        return null;
    }
  };

  // Check if form has any errors
  const validateForm = () => {
    const errors: string[] = [];
    const titleError = getFieldErrorRaw('title');
    const contentError = getFieldErrorRaw('content');
    const priceError = getFieldErrorRaw('price');

    if (titleError) errors.push(titleError);
    if (contentError) errors.push(contentError);
    if (priceError) errors.push(priceError);

    return errors;
  };


  const saveDraft = async () => {
    if (!address) return;
    if (!isAuthenticated) {
      setSubmitError('Authenticate your wallet to save drafts.');
      return;
    }

    try {
      setIsDraft(true);
      const response = await apiService.saveDraft({
        title,
        content,
        price: parseFloat(price) || 0.05,
        authorAddress: address,
        isAutoSave: false
      });

      if (response.success && response.data) {
        setActiveDraftId(response.data.id);
        upsertDraftInState(response.data);
        console.log('Draft saved successfully');
        setTimeout(() => setIsDraft(false), 2000);
      } else {
        setIsDraft(false);
        setSubmitError('Failed to save draft');
      }
    } catch (error: any) {
      setIsDraft(false);
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate to save drafts.');
      } else {
        setSubmitError('Failed to save draft');
      }
      console.error('Error saving draft:', error);
    }
  };

  const loadDrafts = async () => {
    if (!address || !isAuthenticated) return;

    try {
      setLoadingDrafts(true);
      const response = await apiService.getDrafts(address);
      
      if (response.success && response.data) {
        setAvailableDrafts(response.data);
      } else {
        setAvailableDrafts([]);
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setDraftsError('❌ Session not found');
      } else {
        console.error('Error loading drafts:', error);
      }
      setAvailableDrafts([]);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const loadDraft = (draft: Draft) => {
    setTitle(draft.title);
    setContent(draft.content);
    setPrice(draft.price.toString());
    setShowDrafts(false);
    setActiveDraftId(draft.id);
    clearSubmitError();
    console.log('Loaded draft:', draft);
  };

  const deleteDraft = async (draftId: number) => {
    if (!address || !isAuthenticated) return;

    try {
      const response = await apiService.deleteDraft(draftId, address);
      if (response.success) {
        setAvailableDrafts(prev => prev.filter(d => d.id !== draftId));
        if (activeDraftId === draftId) {
          setActiveDraftId(null);
        }
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate again.');
      }
      console.error('Error deleting draft:', error);
    }
  };

  useEffect(() => {
    if (!address || !isAuthenticated) {
      autoLoadKeyRef.current = null;
      if (!isAuthenticated && (new URLSearchParams(location.search)).get('draftId')) {
        setSubmitError('Authenticate your wallet to load drafts.');
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    const params = new URLSearchParams(location.search);
    const draftIdParam = params.get('draftId');

    if (!draftIdParam) {
      autoLoadKeyRef.current = null;
      return;
    }

    const draftId = Number(draftIdParam);
    if (!Number.isFinite(draftId)) {
      return;
    }

    const actionParam = params.get('action');
    const actionKey = actionParam === 'publish' ? 'publish' : '';
    const desiredKey = `${draftId}:${actionKey}`;

    if (autoLoadKeyRef.current === desiredKey) {
      return;
    }

    const fetchDraft = async () => {
      setLoadingDrafts(true);
      try {
        const response = await apiService.getDrafts(address);
        if (response.success && response.data) {
          const match = response.data.find(draft => draft.id === draftId);
          if (match) {
            setAvailableDrafts(response.data);
            loadDraft(match);
            autoLoadKeyRef.current = desiredKey;
            if (actionKey === 'publish') {
              window.setTimeout(() => {
                const fakeEvent = { preventDefault: () => {} } as FormEvent<HTMLFormElement>;
                handleSubmitRef.current?.(fakeEvent);
              }, 0);
            }
          } else {
            autoLoadKeyRef.current = null;
            setSubmitError('Draft not found');
            setShowValidationSummary(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        } else {
          autoLoadKeyRef.current = null;
          const message = response.error || 'Failed to load draft';
          setSubmitError(message);
          setShowValidationSummary(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } catch (error: any) {
        autoLoadKeyRef.current = null;
        if (error?.code === 'AUTH_401') {
          handleAuthError();
          setSubmitError('❌ Session expired. Please authenticate again.');
        } else {
          console.error('Error auto-loading draft:', error);
          setSubmitError('Failed to load draft');
        }
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setLoadingDrafts(false);
      }
    };

    fetchDraft();
  }, [address, location.search, isAuthenticated]);


  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const plainTextContent = useMemo(() => extractPlainText(content).trim(), [content]);
  const previewSummary = useMemo(() => {
    if (!plainTextContent) return 'Add some content to see a preview.';
    return plainTextContent.length > 220 ? `${plainTextContent.slice(0, 217)}...` : plainTextContent;
  }, [plainTextContent]);
  const previewAuthorHandle = useMemo(() => {
    if (address) {
      return `@${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return '@your-handle';
  }, [address]);
  const previewEngagement = useMemo(() => {
    const base = Math.max(180, wordCount * 2);
    return {
      reads: base.toLocaleString(),
      saves: Math.max(12, Math.round(base * 0.08)).toLocaleString(),
      tips: Math.max(3, Math.round(base * parseFloat(price || '0.05') * 0.02)).toLocaleString(),
    };
  }, [wordCount, price]);
  const computedValidationErrors = validateForm();
  const validationErrors = showValidationSummary ? computedValidationErrors : [];
  const summaryMessages = showValidationSummary
    ? [...validationErrors, ...(submitError ? [submitError] : [])]
    : [];
  const hasSummaryErrors = summaryMessages.length > 0;

  if (!isConnected && !isConnecting) {
    return (
      <div className="connect-state connect-state--full">
        <ConnectPromptHero
          title="Connect Your Wallet"
          description="Experience a modern, responsive, and lightweight writing studio with full control over your content."
          highlights={writeHighlights}
        />
      </div>
    );
  }

  const draftsDisabled = !isAuthenticated;

  return (
    <div className="write">
      <div className="write-container">
        {!isAuthenticated && (
          <div className="auth-banner">
            <div className="auth-banner__content">
              <p>
                Authenticate this wallet to access publishing features. Saving drafts and publishing is available once you sign in.
              </p>
              <div className="auth-banner__actions">
                <button
                  className="wallet-connect-button wallet-connect-button--disconnected"
                  type="button"
                  onClick={login}
                  disabled={isAuthenticating}
                >
                  <WalletMinimal
                    size={18}
                    strokeWidth={2.4}
                    className="wallet-connect-button--disconnected__icon"
                    aria-hidden="true"
                  />
                  <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">
                    {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                  </span>
                </button>
                {authError && <span className="auth-banner__error">{authError}</span>}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="write-layout">
          <form id="write-form" onSubmit={handleSubmit} className="write-form" noValidate>
            {/* Success Message */}
            {submitSuccess && publishedArticleId && (
              <div className="submit-success">
                <div className="success-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="success-content">
                  <h4>Article Published Successfully! 🎉</h4>
                  <p>Your article is now live and available for readers to discover.</p>

                  {/* Quick Actions */}
                  <div className="success-actions">
                    <div className="success-share-trigger">
                      <div className="btn-cssbuttons" role="group" aria-label="Share article">
                        <span className="share-trigger-label">
                          Share
                        </span>
                        <span className="share-trigger-icon">
                          <Share2 size={16} aria-hidden="true" />
                        </span>
                        <ul>
                          <li>
                            <button type="button" onClick={shareOnX} aria-label="Share on X">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                              </svg>
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={shareOnFacebook} aria-label="Share on Facebook">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                              </svg>
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={shareOnLinkedIn} aria-label="Share on LinkedIn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                              </svg>
                            </button>
                          </li>
                          <li>
                            <button type="button" onClick={shareOnThreads} aria-label="Share on Threads">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142l-.126 2.006c-.907-.123-1.819-.184-2.714-.184h-.008c-1.205.084-2.199.396-2.961.928-.75.523-1.08 1.14-1.039 1.941.042.812.43 1.42 1.09 1.763.571.297 1.273.426 2.092.384 1.07-.054 1.861-.465 2.429-1.27.453-.642.71-1.515.766-2.604a4.485 4.485 0 0 0-.48-.233c-.963-.403-2.237-.628-3.79-.667a8.556 8.556 0 0 0-2.414.244c-1.235.341-2.223.944-2.935 1.794-1.237 1.476-1.663 3.264-1.268 5.317.394 2.04 1.501 3.722 3.298 5.002 1.797 1.281 3.95 1.93 6.41 1.93 2.886-.024 5.347-1.021 7.313-2.966 1.966-1.945 2.97-4.51 2.985-7.627l-.003-.033c-.022-2.01-.647-3.746-1.856-5.16-1.209-1.415-2.92-2.353-5.082-2.79-.002 0-.002-.002-.002-.002z"/>
                              </svg>
                            </button>
                          </li>
                          <li>
                            <button
                              type="button"
                              onClick={copyArticleLink}
                              aria-label={shareLinkCopied ? 'Link copied' : 'Copy article link'}
                              className={shareLinkCopied ? 'copy-success' : undefined}
                            >
                              {shareLinkCopied ? (
                                <Check size={18} aria-hidden="true" />
                              ) : (
                                <Copy size={18} aria-hidden="true" />
                              )}
                            </button>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="success-actions-spacer" aria-hidden="true"></div>
                    <a href={`/article/${publishedArticleId}`} className="action-btn save-btn">
                      <Eye size={18} />
                      View Article
                    </a>
                    <a href="/dashboard" className="action-btn save-btn">
                      <LayoutDashboard size={18} />
                      Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitSuccess(false);
                        setPublishedArticleId(null);
                        setPublishedArticleTitle('');
                      }}
                      className="action-btn save-btn"
                    >
                      <PenTool size={18} />
                      Write Another
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmitSuccess(false);
                    setPublishedArticleId(null);
                    setPublishedArticleTitle('');
                  }}
                  className="success-close-btn"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Submit Error Message - Moved to top for visibility */}
            {submitError && !showValidationSummary && (
              <div className="submit-error">
                <div className="error-icon">
                  <X size={24} />
                </div>
                <div className="error-content">
                  <h4>Unable to Publish Article</h4>
                  <p style={{ whiteSpace: 'pre-wrap' }}>{submitError}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitError('')}
                  className="error-close-btn"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Validation Summary */}
            {showValidationSummary && (
              <div
                className={`validation-summary ${
                  hasSummaryErrors
                    ? 'validation-summary--errors'
                    : 'validation-summary--success'
                }`}
              >
                <div className="summary-icon">
                  {hasSummaryErrors ? <AlertTriangle size={22} /> : <CheckCircle size={22} />}
                </div>
                <div className="summary-content">
                  {hasSummaryErrors ? (
                    <>
                      <h4>Please fix the following issues</h4>
                      <ul>
                        {summaryMessages.map((error, index) => (
                          <li key={`${error}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
                            {error}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <h4>Your article is ready to publish</h4>
                      <p>Click "Publish Article" to continue.</p>
                    </>
                  )}
                </div>
              </div>
            )}


            {/* Draft Selection Modal */}
            {showDrafts && (
              <div className="draft-modal">
                <div className="draft-modal-header">
                  <h3>Available Drafts</h3>
                  <button 
                    type="button" 
                    onClick={() => setShowDrafts(false)}
                    className="close-btn"
                  >
                    ×
                  </button>
                </div>
                {!isAuthenticated ? (
                  <div className="unauthenticated-drafts">
                    <p>❌ Authenticate your wallet to view drafts.</p>
                  </div>
                ) : (
                  <>
                    <p className="draft-info">We automatically save your work every 5 seconds. Drafts are kept for 7 days.</p>
                    <div className="draft-list">
                      {availableDrafts.length === 0 ? (
                        <p className="no-drafts">No drafts available</p>
                      ) : (
                        availableDrafts.map((draft) => (
                          <div key={draft.id} className="draft-item">
                            <div className="draft-info">
                              <h4>{draft.title || 'Untitled Draft'}</h4>
                              <p className="draft-preview">
                                {extractPlainText(draft.content, 100, 'No content yet')}
                              </p>
                              <div className="draft-meta">
                                <span className={`draft-pill ${draft.isAutoSave ? 'auto' : 'manual'}`}>
                                  {draft.isAutoSave ? 'Auto-save' : 'Manual save'}
                                </span>
                                <span className="draft-date">
                                  <Clock size={14} />
                                  {new Date(draft.updatedAt).toLocaleDateString()}
                                </span>
                                <span className="draft-price">${draft.price.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="draft-actions" role="group" aria-label="Draft actions">
                              <div className="table-cell actions">
                                <button
                                  type="button"
                                  className="action-btn edit-btn"
                                  onClick={() => loadDraft(draft)}
                                  aria-label="Edit draft"
                                  title="Edit draft"
                                >
                                  <Edit aria-hidden="true" />
                                  <span className="sr-only">Edit draft</span>
                                </button>
                                <button
                                  type="button"
                                  className="action-btn delete-btn"
                                  onClick={() => deleteDraft(draft.id)}
                                  aria-label="Delete draft"
                                  title="Delete draft"
                                >
                                  <Trash2 aria-hidden="true" />
                                  <span className="sr-only">Delete draft</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Preview Modal */}
            {showPreview && (
              <div className="modal-overlay">
                <div className="preview-modal">
                  <div className="preview-modal-header">
                    <h3>Article Preview</h3>
                    <button 
                      type="button" 
                      onClick={() => setShowPreview(false)}
                      className="close-btn"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="preview-content">
                    <div className="preview-controls">
                      <div className="preview-toggle-group" role="tablist" aria-label="Device preview">
                        <button
                          type="button"
                          className={previewDevice === 'desktop' ? 'is-active' : ''}
                          onClick={() => setPreviewDevice('desktop')}
                          role="tab"
                          aria-selected={previewDevice === 'desktop'}
                        >
                          Desktop
                        </button>
                        <button
                          type="button"
                          className={previewDevice === 'mobile' ? 'is-active' : ''}
                          onClick={() => setPreviewDevice('mobile')}
                          role="tab"
                          aria-selected={previewDevice === 'mobile'}
                        >
                          Mobile
                        </button>
                      </div>
                    </div>

                    <div className={`preview-stage ${previewDevice}`}>
                      <div className="preview-article-card">
                        <div className="article-card is-preview">
                          <div className="article-card-link">
                            <h3>{title || 'Untitled article'}</h3>
                            <p>{previewSummary}</p>
                          </div>
                          <div className="article-meta">
                            <div className="author-info">
                              <span className="author">by {previewAuthorHandle}</span>
                              <span className="read-time">{estimateReadTime(content)}</span>
                            </div>
                            <span className="price">
                              ${parseFloat(price || '0').toFixed(2)}
                            </span>
                          </div>
                          <div className="article-stats">
                            <div className="article-stats-left">
                              <span className="views">{previewEngagement.reads} views</span>
                              <span className="purchases">{previewEngagement.saves} readers</span>
                            </div>
                            <div className="article-stats-right">
                              <div className="like-button like-button-disabled like-button-preview">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                                </svg>
                                <span>27</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="preview-actions">
                    <button 
                      type="button" 
                      onClick={() => setShowPreview(false)}
                      className="action-btn secondary-btn"
                    >
                      Edit Article
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPreview(false);
                        setShowPublishConfirm(true);
                      }}
                      className="action-btn publish-btn"
                    >
                      <Send size={18} />
                      Publish Article
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Publish Confirmation Modal */}
            {showPublishConfirm && (
              <div className="modal-overlay">
                <div className="confirm-modal">
                  <div className="confirm-modal-header">
                    <h3>Ready to Publish?</h3>
                  </div>
                  <div className="confirm-content">
                    <div className="confirm-article-info">
                      <h4>{title}</h4>
                      <div className="confirm-stats">
                        <span>Price: <strong>${parseFloat(price).toFixed(2)}</strong></span>
                        <span>Read time: <strong>{estimateReadTime(content)}</strong></span>
                        <span>Word count: <strong>{content.trim().split(/\s+/).filter(word => word.length > 0).length} words</strong></span>
                      </div>
                    </div>
                    <p className="confirm-message">
                      Once published, your article will be available for readers to discover and purchase. 
                      You'll earn <strong>${parseFloat(price).toFixed(2)}</strong> each time someone reads your article.
                    </p>
                  </div>
                  <div className="confirm-actions">
                    <button 
                      type="button" 
                      onClick={() => setShowPublishConfirm(false)}
                      className="action-btn secondary-btn"
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      onClick={handlePublishConfirm}
                      className="action-btn publish-btn"
                      disabled={isSubmitting}
                    >
                      <CheckCircle size={18} />
                      {isSubmitting ? 'Publishing...' : 'Confirm & Publish'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Article Details */}
            <div className="article-inputs">
              <section className="article-title-panel" aria-label="Article title">
                <div className="article-title-panel-head">
                  <div>
                    <h3>Article Title</h3>
                  </div>
                  <span className={`title-counter ${title.length > MAX_TITLE_LENGTH * 0.9 ? 'char-warning' : ''}`}>
                    {title.length}/{MAX_TITLE_LENGTH} characters
                  </span>
                </div>
                <textarea
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearSubmitError();
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Enter a title..."
                  className="title-input-auto"
                  rows={1}
                  style={{ resize: 'none', overflow: 'hidden' }}
                  maxLength={MAX_TITLE_LENGTH}
                />
              </section>

              {/* Price & Categories Panel */}
              <section className="article-meta-panel" aria-label="Price and categories controls">
                <div className="article-meta-panel-head">
                  <div>
                    <p className="article-meta-panel-eyebrow"></p>
                    <h3>Price & Categories</h3>
                  </div>
                </div>
                <div className="article-meta-tabs" role="tablist" aria-label="Switch between price and categories">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMetaTab === 'price'}
                    aria-controls="price-meta-pane"
                    id="price-meta-tab"
                    onClick={() => setActiveMetaTab('price')}
                  >
                    Price
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeMetaTab === 'categories'}
                    aria-controls="category-meta-pane"
                    id="category-meta-tab"
                    onClick={() => setActiveMetaTab('categories')}
                  >
                    Categories
                  </button>
                </div>
                <div className="article-meta-panel-body">
                  <div
                    className={`article-meta-pane ${activeMetaTab === 'categories' ? 'is-hidden-mobile' : ''}`}
                    role="tabpanel"
                    aria-labelledby="price-meta-tab"
                    id="price-meta-pane"
                  >
                    <div className="price-section-enhanced">
                      <label htmlFor="price" className="input-label">Price</label>
                      <div className="price-presets">
                        <div className="price-presets-label">Quick Presets:</div>
                        <div className="price-presets-buttons">
                          {pricePresets.map((presetValue) => (
                            <button
                              key={presetValue}
                              type="button"
                              className={`price-preset-btn ${parseFloat(price) === presetValue ? 'active' : ''}`}
                              onClick={() => handlePresetClick(presetValue)}
                            >
                              ${presetValue.toFixed(2)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="price-custom-input">
                        <label htmlFor="price-custom" className="price-custom-label">Custom:</label>
                        <div className="price-input-simple">
                          <span>$</span>
                          <input
                            type="number"
                            id="price-custom"
                            value={price}
                            onChange={(e) => {
                              setPrice(e.target.value);
                              clearSubmitError();
                            }}
                            step="0.01"
                            min="0.01"
                            max="1.00"
                            placeholder="0.05"
                          />
                        </div>
                      </div>
                      <div className="price-earnings-preview">
                        <div className="earnings-preview-icon">💡</div>
                        <div className="earnings-preview-content">
                          <div className="earnings-preview-label">Earnings Preview:</div>
                          <div className="earnings-preview-values">
                            <div>At 100 reads: <strong>${calculateEarnings(parseFloat(price) || 0.05, 100)}</strong></div>
                            <div>At 1,000 reads: <strong>${calculateEarnings(parseFloat(price) || 0.05, 1000)}</strong></div>
                          </div>
                        </div>
                      </div>
                      {(parseFloat(price) < 0.01 || parseFloat(price) > 1.00) && (
                        <div className="price-range-info price-range-error">
                          <span className="price-range-text">
                            Price must be between $0.01 and $1.00
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="article-meta-divider" aria-hidden="true"></div>
                  <div
                    className={`article-meta-pane ${activeMetaTab === 'price' ? 'is-hidden-mobile' : ''}`}
                    role="tabpanel"
                    aria-labelledby="category-meta-tab"
                    id="category-meta-pane"
                  >
                    <div className="category-dropdown-container" ref={categoryDropdownRef}>
                      <label className="input-label">Categories (Optional)</label>
                      <p className="categories-description">
                        Select up to {MAX_CATEGORIES} categories that best describe your article. This helps readers discover your content.
                      </p>
                      {selectedCategories.length > 0 && (
                        <div className="category-selected-chips">
                          {selectedCategories.map(category => (
                            <div key={category} className="category-chip">
                              <span className="category-chip-emoji">{categoryEmojis[category]}</span>
                              <span>{category}</span>
                              <button
                                type="button"
                                className="category-chip-remove"
                                onClick={() => removeCategory(category)}
                                aria-label={`Remove ${category}`}
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div
                        className={`category-dropdown-trigger ${showCategoryDropdown ? 'open' : ''}`}
                        onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                      >
                        <span className="category-dropdown-trigger-text">
                          {selectedCategories.length === 0 ? (
                            'Select categories...'
                          ) : (
                            <span>{selectedCategories.length}/{MAX_CATEGORIES} selected</span>
                          )}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`category-dropdown-icon ${showCategoryDropdown ? 'open' : ''}`}
                        />
                      </div>
                      {showCategoryDropdown && (
                        <div className="category-dropdown-menu">
                          <div className="category-search">
                            <div style={{ position: 'relative' }}>
                              <Search
                                size={16}
                                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                              />
                              <input
                                type="text"
                                className="category-search-input"
                                placeholder="Search categories..."
                                value={categorySearchQuery}
                                onChange={(e) => setCategorySearchQuery(e.target.value)}
                                style={{ paddingLeft: '32px' }}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          {Object.keys(getFilteredCategories()).length > 0 ? (
                            Object.entries(getFilteredCategories()).map(([groupName, categories]) => (
                              <div key={groupName} className="category-group">
                                <div className="category-group-header">
                                  {groupName} ({categories.length})
                                </div>
                                {categories.map(category => {
                                  const isSelected = selectedCategories.includes(category);
                                  const isDisabled = !isSelected && selectedCategories.length >= MAX_CATEGORIES;
                                  return (
                                    <div
                                      key={category}
                                      className={`category-dropdown-item ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                                      onClick={() => {
                                        if (!isDisabled) {
                                          toggleCategory(category);
                                        }
                                      }}
                                    >
                                      <div className="category-dropdown-item-content">
                                        <span className="category-dropdown-item-emoji">{categoryEmojis[category]}</span>
                                        <span>{category}</span>
                                      </div>
                                      {isSelected && (
                                        <span className="category-dropdown-checkmark">✓</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))
                          ) : (
                            <div className="category-dropdown-empty">
                              No categories match "{categorySearchQuery}"
                            </div>
                          )}
                        </div>
                      )}
                   </div>
                 </div>
               </div>
             </section>
            </div>
            {/* Content Editor */}
            <div className="form-group">
              <div className="content-header">
                <label htmlFor="content" className="input-label">Article Body</label>
                <div className="write-stats">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span className={charCount > MAX_CONTENT_LENGTH * 0.9 ? 'char-warning' : ''}>
                    {charCount.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()} characters
                  </span>
                </div>
              </div>
                <div className="tinymce-wrapper">
                <Editor
                  apiKey="7ahasmo84ufchymcd8xokq6qz4l1lh2zdf1wnucvaaeuaxci"
                  value={content}
                  onEditorChange={(content) => {
                    console.log('[write] Editor change detected. suppress?', suppressSubmitClearRef.current);
                    setContent(content);
                    clearSubmitError();
                  }}
                  init={{
                    height: 800,
                    menubar: false,
                    resize: false,
                    statusbar: false,
                    plugins: [
                      'image', 'link', 'lists', 'code', 'table', 'media', 'codesample', 'autolink', 'wordcount', 'nonbreaking'
                    ],
                    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | link image media table | code codesample | bullist numlist outdent indent | removeformat',
                    
                    // Image upload configuration
                    images_upload_url: 'http://localhost:3001/api/upload',
                    images_upload_credentials: false,
                    automatic_uploads: true,
                    
                    // File picker for more control
                    file_picker_types: 'image',
                    file_picker_callback: (callback: any, value: any, meta: any) => {
                      if (meta.filetype === 'image') {
                        const input = document.createElement('input');
                        input.setAttribute('type', 'file');
                        input.setAttribute('accept', 'image/*');
                        
                        input.onchange = function() {
                          const file = (this as HTMLInputElement).files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            fetch('http://localhost:3001/api/upload', {
                              method: 'POST',
                              body: formData
                            })
                            .then(response => response.json())
                            .then(result => {
                              if (result.location) {
                                callback('http://localhost:3001' + result.location, { alt: file.name });
                              }
                            })
                            .catch(error => {
                              console.error('Upload failed:', error);
                            });
                          }
                        };
                        
                        input.click();
                      }
                    },
                    content_style: `
                      body {
                        font-family: 'Inter', system-ui, -apple-system, sans-serif;
                        font-size: 16px;
                        line-height: 1.7;
                        max-width: none;
                        margin: 0;
                        padding: 20px;
                        color: #1a1a1a;
                      }
                      h1, h2, h3 { color: #1a1a1a; margin-top: 2em; margin-bottom: 0.5em; }
                      h1 { font-size: 2em; font-weight: 700; }
                      h2 { font-size: 1.5em; font-weight: 600; }
                      h3 { font-size: 1.25em; font-weight: 600; }
                      p { margin-bottom: 1em; }
                      code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                      pre { background: #f8f9fa; padding: 1em; border-radius: 8px; overflow-x: auto; }
                      blockquote { border-left: 4px solid #e5e7eb; margin: 1.5em 0; padding-left: 1em; color: #6b7280; }
                      table { border-collapse: collapse; width: 100%; margin: 1em 0; border: 1px solid #e1e8ed; }
                      table td, table th { border: 1px solid #e1e8ed; padding: 12px 16px; text-align: left; }
                      table th { background-color: #f8f9fa; font-weight: 600; }
                    `,
                    skin: 'oxide',
                    branding: false,
                    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Quote=blockquote',
                    paste_as_text: false,
                    smart_paste: true,
                    setup: (editor: any) => {
                      // Enable Tab key for indentation
                      editor.on('keydown', (e: KeyboardEvent) => {
                        if (e.key === 'Tab') {
                          e.preventDefault();
                          if (e.shiftKey) {
                            editor.execCommand('Outdent');
                          } else {
                            editor.execCommand('Indent');
                          }
                        }
                      });
                    }
                  }}
                />
              </div>
            </div>

            {/* Sticky Action Bar */}
            <div className="write-actions-bar">
              <div className="actions-bar-left">
                <div className="actions-bar-status">
                  {isTyping || isAutoSaving ? (
                    <>
                      <Loader2 className="status-icon spin saving" size={14} />
                      <span>Saving changes...</span>
                    </>
                  ) : lastAutoSaveAt ? (
                    <>
                      <Check className="status-icon saved" size={14} />
                      <span>Last saved at {lastAutoSaveAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  ) : (
                    <>
                      <Dot className="status-icon idle" size={14} />
                      <span>No changes</span>
                    </>
                  )}
                </div>
                <div className="actions-bar-wordcount">
                  <span>{wordCount} words</span>
                  <div className="actions-bar-divider" />
                  <span className={charCount > MAX_CONTENT_LENGTH * 0.9 ? 'char-warning' : ''}>
                    {charCount.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()} chars
                  </span>
                </div>
              </div>
              <div className="actions-bar-right">
                <button
                  type="button"
                  onClick={() => {
                    if (!isAuthenticated) {
                      setShowDrafts(true);
                      return;
                    }
                    if (showDrafts) {
                      setShowDrafts(false);
                    } else {
                      loadDrafts();
                      setShowDrafts(true);
                      setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }, 0);
                    }
                  }}
                  className="action-btn draft-btn"
                  disabled={loadingDrafts}
                >
                  <FileText size={18} />
                  {loadingDrafts ? 'Loading...' : 'Drafts'}
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  className="action-btn save-btn"
                  disabled={isDraft || !isAuthenticated}
                >
                  <Save size={18} />
                  {isDraft ? 'Saved!' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreview(true)}
                  className="action-btn preview-btn"
                  disabled={!title.trim() || !content.trim()}
                >
                  <Eye size={18} />
                  Preview
                </button>
                <button
                  type="submit"
                  className="action-btn publish-btn"
                  disabled={isSubmitting || !isAuthenticated}
                >
                  <Send size={18} />
                  {isSubmitting ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}

export default Write;
