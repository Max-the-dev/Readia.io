import { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import AppKitConnectButton from '../components/AppKitConnectButton';
import { Save, Send, FileText, Clock, Eye, CheckCircle, X, AlertTriangle, Loader2, Check, Dot } from 'lucide-react';
import { apiService, Draft, CreateArticleRequest } from '../services/api';
import { Editor } from '@tinymce/tinymce-react';
import { extractPlainText } from '../utils/htmlUtils';

function Write() {
  const { isConnected, address } = useWallet();
  const location = useLocation();
  
  // Available categories (must match backend validation schema exactly)
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

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
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
  const handleSubmitRef = useRef<(event: FormEvent<HTMLFormElement>) => void | Promise<void>>();
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
      try {
        autoSaveControllerRef.current?.abort();
        const controller = new AbortController();
        autoSaveControllerRef.current = controller;
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
          console.log('Auto-save request aborted');
        } else {
          console.error('Auto-save failed:', error);
        }
      } finally {
        autoSaveControllerRef.current = null;
        setIsAutoSaving(false);
        autoSaveTimeoutRef.current = null;
      }
    }, 5000);

    return () => {
      clearAutoSaveTimers();
    };
  }, [title, content, price, address, isAutoSaving, isSubmitting, clearAutoSaveTimers]);

  // Load available drafts when connected
  useEffect(() => {
    if (address) {
      loadDrafts();
    }
  }, [address]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!address) {
      setSubmitError('Please connect your wallet first');
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
    } catch (error) {
      console.error('Article validation request failed:', error);
      const message = error instanceof Error ? error.message : 'Unable to validate article';
      setSubmitError(message);
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

      if (response.success) {
        suppressSubmitClearRef.current = true;
        if (draftIdToClear !== null) {
          setAvailableDrafts(prev => prev.filter(d => d.id !== draftIdToClear));
        }
        setActiveDraftId(null);

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
    } catch (error) {
      const err = error as any;
      // Check if error has validation details
      if (err.details && Array.isArray(err.details)) {
        const detailedErrors = err.details.map((d: any) => `${d.field}: ${d.message}`).join('; ');
        setSubmitError(`Validation failed: ${detailedErrors}`);
      } else {
        setSubmitError(err.message || 'An unexpected error occurred');
      }
      console.error('Error creating article:', error);

      setShowValidationSummary(true);

      // Scroll to top to show error message
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
    } catch (error) {
      setIsDraft(false);
      setSubmitError('Failed to save draft');
      console.error('Error saving draft:', error);
    }
  };

  const loadDrafts = async () => {
    if (!address) return;

    try {
      setLoadingDrafts(true);
      const response = await apiService.getDrafts(address);
      
      if (response.success && response.data) {
        setAvailableDrafts(response.data);
      } else {
        setAvailableDrafts([]);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
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
    if (!address) return;

    try {
      const response = await apiService.deleteDraft(draftId, address);
      if (response.success) {
        setAvailableDrafts(prev => prev.filter(d => d.id !== draftId));
        if (activeDraftId === draftId) {
          setActiveDraftId(null);
        }
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  useEffect(() => {
    if (!address) {
      autoLoadKeyRef.current = null;
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
      } catch (error) {
        autoLoadKeyRef.current = null;
        console.error('Error auto-loading draft:', error);
        setSubmitError('Failed to load draft');
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setLoadingDrafts(false);
      }
    };

    fetchDraft();
  }, [address, location.search]);


  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const computedValidationErrors = validateForm();
  const validationErrors = showValidationSummary ? computedValidationErrors : [];
  const summaryMessages = showValidationSummary
    ? [...validationErrors, ...(submitError ? [submitError] : [])]
    : [];
  const hasSummaryErrors = summaryMessages.length > 0;

  if (!isConnected) {
    return (
      <div className="write">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to start writing and publishing articles on Penny.io</p>
            <AppKitConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write">
      <div className="write-container">

        {/* Main Content */}
        <div className="write-layout">
          <form id="write-form" onSubmit={handleSubmit} className="write-form" noValidate>
            {/* Success Message */}
            {submitSuccess && (
              <div className="submit-success">
                <div className="success-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="success-content">
                  <h4>Article Published Successfully! 🎉</h4>
                  <p>Your article is now live and available for readers to discover. You'll earn <strong>${parseFloat(price).toFixed(2)}</strong> each time someone purchases and reads your article.</p>
                  <div className="success-actions">
                    <a href="/dashboard" className="action-btn secondary-btn">
                      View in Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmitSuccess(false)}
                      className="action-btn draft-btn"
                    >
                      Write Another Article
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
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
                        <div className="draft-actions">
                          <button 
                            type="button"
                            onClick={() => loadDraft(draft)}
                            className="load-draft-btn"
                          >
                            Edit
                          </button>
                          <button 
                            type="button"
                            onClick={() => deleteDraft(draft.id)}
                            className="delete-draft-btn"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                    <div className="preview-meta">
                      <h1 className="preview-title">{title}</h1>
                      <div className="preview-stats">
                        <span className="preview-price">${parseFloat(price).toFixed(2)}</span>
                        <span>•</span>
                        <span className="preview-read-time">{estimateReadTime(content)}</span>
                        <span>•</span>
                        <span className="preview-word-count">
                          {extractPlainText(content).split(/\s+/).filter(Boolean).length} words
                        </span>
                      </div>
                    </div>
                    <div className="preview-body">
                      <div className="preview-text">
                        {generatePreview(content)}
                      </div>
                      {content.length > 300 && (
                        <p className="preview-more">...view more</p>
                      )}
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
              <div className="title-section">
                <label htmlFor="title" className="input-label">Article Title</label>
                <textarea
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    clearSubmitError();
                    // Auto-resize height
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.stopPropagation();
                    }
                  }}
                  placeholder="Enter your article title..."
                  className="title-input-auto"
                  rows={1}
                  style={{ resize: 'none', overflow: 'hidden' }}
                  maxLength={MAX_TITLE_LENGTH}
                />
                <div className="title-counter">
                  <span className={title.length > MAX_TITLE_LENGTH * 0.9 ? 'char-warning' : ''}>
                    {title.length}/{MAX_TITLE_LENGTH} characters
                  </span>
                </div>
              </div>
              <div className="price-section">
                <label htmlFor="price" className="input-label">Price</label>
                <div className="price-input-simple">
                  <span>$</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => {
                      setPrice(e.target.value);
                      clearSubmitError();
                    }}
                    step="0.01"
                    placeholder="0.05"
                  />
                </div>
              </div>

              {/* Categories Section */}
              <div className="categories-section">
                <label className="input-label">Categories (Optional)</label>
                <p className="categories-description">
                  Select up to {MAX_CATEGORIES} categories that best describe your article. This helps readers discover your content.
                </p>
                <div className="categories-grid">
                  {availableCategories.map(category => {
                    const isSelected = selectedCategories.includes(category);
                    const isDisabled = !isSelected && selectedCategories.length >= MAX_CATEGORIES;
                    return (
                      <button
                        key={category}
                        type="button"
                        className={`category-tag ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                        onClick={() => {
                          toggleCategory(category);
                          clearSubmitError();
                        }}
                        disabled={isDisabled}
                        title={isDisabled ? `Maximum ${MAX_CATEGORIES} categories selected. Remove one to add another.` : ''}
                      >
                        {category}
                        {isSelected && <span className="check-mark">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="selected-categories-summary">
                    <span className="selected-count">
                      {selectedCategories.length}/{MAX_CATEGORIES} selected:
                    </span>
                    <span className="selected-list">{selectedCategories.join(', ')}</span>
                  </div>
                )}
              </div>
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
                      'image', 'link', 'lists', 'code', 'table', 'media', 'codesample', 'autolink', 'powerpaste', 'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | bold italic underline | link image media table | code codesample | bullist numlist outdent indent | removeformat',
                    
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
                    `,
                    skin: 'oxide',
                    branding: false,
                    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Quote=blockquote',
                    paste_as_text: false,
                    smart_paste: true
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
                    if (showDrafts) {
                      setShowDrafts(false);
                    } else {
                      loadDrafts();
                      setShowDrafts(true);
                      // Scroll to top after state updates (next frame)
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
                  disabled={isDraft}
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
                  disabled={isSubmitting}
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
