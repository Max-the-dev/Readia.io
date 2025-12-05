import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import AppKitConnectButton from '../components/AppKitConnectButton';
import { useTheme } from '../contexts/ThemeContext';
import { Save, Eye, ArrowLeft, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';
import { apiService, Article, API_BASE_URL } from '../services/api';
import { sanitizeHTML } from '../utils/sanitize';

function EditArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isConnected, address } = useWallet();
  const { login, isAuthenticated, isAuthenticating, error: authError, handleAuthError, getAuthHeaders } = useAuth();
  
  const [article, setArticle] = useState<Article | null>(null);
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState<boolean>(false);
  const [showValidationSummary, setShowValidationSummary] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(false);
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);

  // Content limits (match Write page)
  const MAX_TITLE_LENGTH = 200;
  const MIN_CONTENT_LENGTH = 50;
  const MAX_CONTENT_LENGTH = 50000;

  const clearSubmitFeedback = () => {
    if (submitError) {
      setSubmitError('');
    }
    if (submitSuccess) {
      setSubmitSuccess(false);
    }
  };

  const getFieldError = (field: 'title' | 'content' | 'price'): string | null => {
    switch (field) {
      case 'title':
        if (!title.trim()) return 'Title is required';
        if (title.trim().length > MAX_TITLE_LENGTH) return `Title must be ${MAX_TITLE_LENGTH} characters or less`;
        return null;
      case 'content': {
        if (!content.trim()) return 'Content is required';
        const textContent = content.replace(/<[^>]*>/g, '').trim();
        if (textContent.length < MIN_CONTENT_LENGTH) return `Content must be at least ${MIN_CONTENT_LENGTH} characters`;
        if (content.length > MAX_CONTENT_LENGTH) return `Content must be ${MAX_CONTENT_LENGTH.toLocaleString()} characters or less`;
        return null;
      }
      case 'price': {
        const priceValue = parseFloat(price);
        if (!Number.isFinite(priceValue)) return 'Valid price is required';
        if (priceValue < 0.01) return 'Price must be at least $0.01';
        if (priceValue > 1.0) return 'Price cannot exceed $1.00';
        return null;
      }
      default:
        return null;
    }
  };

  const validateForm = () => {
    const errors: string[] = [];
    const titleError = getFieldError('title');
    const contentError = getFieldError('content');
    const priceError = getFieldError('price');

    if (titleError) errors.push(titleError);
    if (contentError) errors.push(contentError);
    if (priceError) errors.push(priceError);

    return errors;
  };

  const computedValidationErrors = validateForm();
  const validationErrors = showValidationSummary ? computedValidationErrors : [];
  const summaryMessages = showValidationSummary
    ? [...validationErrors, ...(submitError ? [submitError] : [])]
    : [];
  const hasSummaryErrors = summaryMessages.length > 0;

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;
  const applyEditorTheme = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const doc = editor.getDoc();
    if (!doc) return;

    const root = doc.documentElement;
    if (!root) return;
    const palette: Record<string, string> = theme === 'dark'
      ? {
          'text-color': '#f5f5f5',
          'heading-color': '#ffffff',
          'muted-color': '#d1d5db',
          'code-bg': '#1f2933',
          'code-text': '#f5f5f5',
          'pre-bg': '#111827',
          'blockquote-border': '#374151',
          'blockquote-text': '#cbd5f5',
          'table-border': '#374151',
          'table-head-bg': '#1f2933'
        }
      : {
          'text-color': '#1a1a1a',
          'heading-color': '#1a1a1a',
          'muted-color': '#6b7280',
          'code-bg': '#f3f4f6',
          'code-text': '#1a1a1a',
          'pre-bg': '#f8f9fa',
          'blockquote-border': '#e5e7eb',
          'blockquote-text': '#6b7280',
          'table-border': '#e1e8ed',
          'table-head-bg': '#f8f9fa'
        };

    Object.entries(palette).forEach(([token, value]) => {
      root.style.setProperty(`--editor-${token}`, value);
    });

    if (doc.body) {
      doc.body.style.background = 'transparent';
      doc.body.style.color = palette['text-color'];
      doc.body.style.caretColor = palette['text-color'];
    }
  }, [theme]);

  useEffect(() => {
    applyEditorTheme();
  }, [applyEditorTheme]);

  // Load article data on component mount
  useEffect(() => {
    if (id && isAuthenticated && address) {
      loadArticle();
    }
  }, [id, isAuthenticated, address]);

  useEffect(() => {
    if (!isAuthenticated) {
      setArticle(null);
      setTitle('');
      setContent('');
      setPrice('0.05');
      setSubmitSuccess(false);
      setSubmitError('');
      setShowValidationSummary(false);
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadArticle = async () => {
    if (!id || !isAuthenticated || !address) return;

    setLoading(true);
    setCheckingAuth(true);
    try {
      const response = await apiService.getArticleById(parseInt(id));
      if (response.success && response.data) {
        const articleData = response.data;
        setArticle(articleData);
        setTitle(articleData.title);
        setContent(articleData.content);
        setPrice(articleData.price.toString());
        setSubmitError('');
        setSubmitSuccess(false);
        setShowValidationSummary(false);

        // Check if user can edit this article (supports secondary wallets)
        await checkEditPermission(parseInt(id), address);
      } else {
        setSubmitError('Article not found');
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate again.');
      } else {
        setSubmitError('Error loading article');
        console.error('Error loading article:', error);
      }
    } finally {
      setLoading(false);
      setCheckingAuth(false);
    }
  };

  const checkEditPermission = async (articleId: number, userAddress: string) => {
    try {
      const response = await apiService.canEditArticle(articleId, userAddress);
      if (response.success && response.data) {
        setIsAuthorized(response.data.canEdit);
      } else {
        setIsAuthorized(false);
      }
    } catch (error) {
      console.error('Error checking edit permission:', error);
      setIsAuthorized(false);
    }
  };

  const handleUpdateArticle = async () => {
    if (!address || !article) return;

    if (!isAuthenticated) {
      setSubmitError('Authenticate your wallet to edit this article.');
      setShowValidationSummary(true);
      setShowUpdateConfirm(false);
      return;
    }

    const priceValue = parseFloat(price);
    if (!Number.isFinite(priceValue)) {
      setSubmitError('Valid price is required');
      setShowValidationSummary(true);
      return;
    }

    setIsSubmitting(true);
    setShowUpdateConfirm(false);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const response = await apiService.updateArticle(article.id, {
        title: title.trim(),
        content: content.trim(),
        price: priceValue,
        authorAddress: address
      });

      if (response.success) {
        setShowValidationSummary(false);
        setSubmitError('');
        setSubmitSuccess(true);
      } else {
        if (response.error === 'AUTH_REQUIRED') {
          setSubmitError('Authenticate your wallet to edit this article.');
        } else {
          setSubmitError(response.error || 'Failed to update article');
        }
        setShowValidationSummary(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      if (error?.code === 'AUTH_401') {
        handleAuthError();
        setSubmitError('❌ Session expired. Please authenticate again.');
      } else {
        setSubmitError('An unexpected error occurred');
        console.error('Error updating article:', error);
      }
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate read time estimate
  const calculateReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text.replace(/<[^>]*>/g, '').split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  const handleUpdateConfirm = async () => {
    if (!address) {
      setSubmitError('Please connect your wallet first');
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isAuthenticated) {
      setSubmitError('Authenticate your wallet to edit this article.');
      setShowValidationSummary(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const errors = validateForm();
    if (errors.length > 0) {
      setShowValidationSummary(true);
      setSubmitError('');
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

    setSubmitError('');
    setShowValidationSummary(false);
    setSubmitSuccess(false);
    setShowUpdateConfirm(true);
  };

  if (!isConnected) {
    return (
      <div className="write-page">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to edit articles.</p>
            <AppKitConnectButton />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="write">
        <div className="write-container">
          <div className="auth-banner auth-banner--centered">
            <div className="auth-banner__content">
              <p>Authenticate this wallet to access publishing features. Saving drafts and publishing is available once you sign in.</p>
              <div className="auth-banner__actions">
                <button
                  className="wallet-connect-button wallet-connect-button--disconnected"
                  type="button"
                  onClick={login}
                  disabled={isAuthenticating}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="wallet-connect-button--disconnected__icon" aria-hidden="true">
                    <path d="M17 14h.01"></path>
                    <path d="M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"></path>
                  </svg>
                  <span className="wallet-connect-button__text wallet-connect-button--disconnected__label">
                    {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                  </span>
                </button>
                {authError && <span className="auth-banner__error">{authError}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || checkingAuth) {
    return (
      <div className="write-page">
        <div className="container">
          <div className="loading-state">
            <p>{checkingAuth ? 'Checking permissions...' : 'Loading article...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="write-page">
        <div className="container">
          <div className="error-message">
            <p>❌ Article not found</p>
            <button onClick={() => navigate('/dashboard')} className="retry-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="write-page">
        <div className="container">
          <div className="error-message">
            <p>❌ You are not authorized to edit this article</p>
            <button onClick={() => navigate('/dashboard')} className="retry-btn">
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const editLocked = !isAuthenticated;

  return (
    <div className="write">
      <div className="write-container">
        {!isAuthenticated && (
          <div className="auth-banner">
            <div className="auth-banner__content">
              <p>Authenticate this wallet to access the dashboard. Article controls, insights, and wallet management stay hidden until you sign in.</p>
              <div className="auth-banner__actions">
                <button
                  className="wallet-connect-button wallet-connect-button--disconnected"
                  type="button"
                  onClick={login}
                  disabled={isAuthenticating}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="wallet-connect-button--disconnected__icon" aria-hidden="true">
                    <path d="M17 14h.01"></path>
                    <path d="M7 7h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14"></path>
                  </svg>
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
          <form className="write-form">
            {/* Success Message */}
            {submitSuccess && (
              <div className="submit-success">
                <div className="success-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="success-content">
                  <h4>Article Updated Successfully! 🎉</h4>
                  <p>Your changes have been saved and the article is now updated.</p>
                  <div className="success-actions">
                    <button 
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="action-btn secondary-btn"
                    >
                      Back to Dashboard
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

            {/* Submit Error Message */}
            {submitError && !showValidationSummary && (
              <div className="submit-error">
                <div className="error-icon">
                  <X size={24} />
                </div>
                <div className="error-content">
                  <h4>Unable to Update Article</h4>
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
            {showValidationSummary && hasSummaryErrors && (
              <div className="validation-summary validation-summary--errors">
                <div className="summary-icon">
                  <AlertTriangle size={22} />
                </div>
                <div className="summary-content">
                  <h4>Please fix the following issues</h4>
                  <ul>
                    {summaryMessages.map((error, index) => (
                      <li key={`${error}-${index}`} style={{ whiteSpace: 'pre-wrap' }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="article-actions">
              <div className="draft-actions">
                <button 
                  type="button" 
                  onClick={() => navigate('/dashboard')}
                  className="action-btn draft-btn"
                >
                  <ArrowLeft size={18} />
                  Back to Dashboard
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
              </div>
              <button 
                type="button" 
                onClick={handleUpdateConfirm}
                className="action-btn publish-btn"
                disabled={isSubmitting || editLocked}
              >
                <Save size={18} />
                {isSubmitting ? 'Updating...' : 'Update Article'}
              </button>
            </div>

            {/* Article Details */}
            <div className="article-inputs">
              <div className="title-section">
                <label htmlFor="title" className="input-label">Article Title</label>
                <textarea
                  id="title"
                  value={title}
                  onChange={(e) => {
                    clearSubmitFeedback();
                    setTitle(e.target.value);
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
                  required
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
                      clearSubmitFeedback();
                      setPrice(e.target.value);
                    }}
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    placeholder="0.05"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Content Editor */}
            <div className="form-group">
              <div className="content-header">
                <label htmlFor="content" className="input-label">Article Body</label>
                <div className="write-stats">
                  <span>{wordCount} words</span>
                  <span>•</span>
                  <span>{charCount}/{MAX_CONTENT_LENGTH.toLocaleString()} characters</span>
                </div>
              </div>
              <div className="tinymce-wrapper">
                <Editor
                  apiKey="7ompssow13ixn3z1ds3slkwik6xp3uytm0sks18m4sqk2m4q"
                    value={content}
                    onInit={(_, editor) => {
                      editorRef.current = editor;
                      applyEditorTheme();
                    }}
                  onEditorChange={(content) => {
                    clearSubmitFeedback();
                    setContent(content);
                  }}
                  init={{
                    height: 700,
                    menubar: false,
                    resize: false,
                    statusbar: false,
                    plugins: [
                      'image', 'link', 'lists', 'code', 'table', 'media', 'codesample', 'autolink', 'wordcount', 'nonbreaking'
                    ],
                    toolbar: 'undo redo | blocks | bold italic underline | alignleft aligncenter alignright alignjustify | link image media table | code codesample | bullist numlist outdent indent | removeformat',
                    
                    // Image upload configuration
                    images_upload_url: `${API_BASE_URL}/upload`,
                    images_upload_credentials: false,
                    automatic_uploads: true,
                    images_upload_handler: async (blobInfo: any) => {
                      if (!isAuthenticated) {
                        setSubmitError('Authenticate your wallet to upload images.');
                        throw new Error('Authentication required');
                      }

                      const authHeaders = getAuthHeaders();
                      if (!authHeaders.Authorization) {
                        setSubmitError('Authenticate your wallet to upload images.');
                        throw new Error('Authentication required');
                      }

                      const formData = new FormData();
                      formData.append('file', blobInfo.blob(), blobInfo.filename());

                      const response = await fetch(`${API_BASE_URL}/upload`, {
                        method: 'POST',
                        headers: authHeaders,
                        body: formData,
                      });

                      if (response.status === 401) {
                        handleAuthError();
                        setSubmitError('❌ Session expired. Please authenticate again.');
                        throw new Error('Unauthorized');
                      }

                      const result = await response.json();
                      if (!response.ok || !result.success || !result.location) {
                        throw new Error(result.error || 'Failed to upload image');
                      }

                      return result.location;
                    },
                    
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
                            if (!isAuthenticated) {
                              setSubmitError('Authenticate your wallet to upload images.');
                              return;
                            }
                            const authHeaders = getAuthHeaders();
                            if (!authHeaders.Authorization) {
                              setSubmitError('Authenticate your wallet to upload images.');
                              return;
                            }
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            fetch(`${API_BASE_URL}/upload`, {
                              method: 'POST',
                              headers: authHeaders,
                              body: formData
                            })
                            .then(async response => {
                              if (response.status === 401) {
                                handleAuthError();
                                setSubmitError('❌ Session expired. Please authenticate again.');
                                throw new Error('Unauthorized');
                              }
                              return response.json();
                            })
                            .then(result => {
                              if (result.success && result.location) {
                                callback(result.location, { alt: file.name });
                              } else {
                                throw new Error(result.error || 'Upload failed');
                              }
                            })
                            .catch(error => {
                              console.error('Upload failed:', error);
                              setSubmitError(`Failed to upload image: ${error.message}`);
                              callback('', { alt: '' }); // Trigger failure callback
                            });
                          }
                        };
                        
                        input.click();
                      }
                    },
                    
                    content_style: `
                      :root {
                        --editor-text-color: #1a1a1a;
                        --editor-heading-color: #1a1a1a;
                        --editor-muted-color: #6b7280;
                        --editor-code-bg: #f3f4f6;
                        --editor-code-text: #1a1a1a;
                        --editor-pre-bg: #f8f9fa;
                        --editor-blockquote-border: #1d9bf0;
                        --editor-blockquote-text: #536471;
                        --editor-table-border: #e1e8ed;
                        --editor-table-head-bg: #f8f9fa;
                      }
                      body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
                        font-size: 16px;
                        line-height: 1.6;
                        color: var(--editor-text-color);
                        padding: 20px;
                        max-width: none;
                        background: transparent;
                      }
                      h1, h2, h3, h4, h5, h6 {
                        color: var(--editor-heading-color);
                        font-weight: 600;
                        margin-top: 2rem;
                        margin-bottom: 1rem;
                      }
                      h1 { font-size: 2rem; }
                      h2 { font-size: 1.5rem; }
                      h3 { font-size: 1.25rem; }
                      p { margin: 0 0 1rem 0; }
                      blockquote {
                        border-left: 4px solid var(--editor-blockquote-border);
                        padding-left: 16px;
                        margin: 1rem 0;
                        font-style: italic;
                        color: var(--editor-blockquote-text);
                      }
                      code {
                        background: var(--editor-code-bg);
                        color: var(--editor-code-text);
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
                        font-size: 0.9em;
                      }
                      pre {
                        background: var(--editor-pre-bg);
                        color: var(--editor-code-text);
                        padding: 16px;
                        border-radius: 8px;
                        overflow-x: auto;
                        border: 1px solid var(--editor-table-border);
                      }
                      img {
                        max-width: 100%;
                        height: auto;
                        border-radius: 8px;
                        margin: 1rem 0;
                      }
                      a {
                        color: #1d9bf0;
                        text-decoration: none;
                      }
                      a:hover {
                        text-decoration: underline;
                      }
                      ul, ol {
                        padding-left: 2rem;
                        margin: 1rem 0;
                      }
                      li {
                        margin: 0.5rem 0;
                      }
                      table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 1rem 0;
                        border: 1px solid var(--editor-table-border);
                      }
                      table td, table th {
                        border: 1px solid var(--editor-table-border);
                        padding: 12px 16px;
                        text-align: left;
                      }
                      table th {
                        background: var(--editor-table-head-bg);
                        font-weight: 600;
                        color: var(--editor-heading-color);
                      }
                    `,
                    
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

                      editor.on('change', () => {
                        setContent(editor.getContent());
                      });
                    }
                  }}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="modal-overlay" onClick={handlePreviewClose}>
            <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="preview-modal-header">
                <h3>Article Preview</h3>
                <button 
                  type="button" 
                  onClick={handlePreviewClose}
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
                    <span className="preview-read-time">{calculateReadTime(content)}</span>
                    <span>•</span>
                    <span className="preview-word-count">{wordCount} words</span>
                  </div>
                </div>
                <div className="preview-body">
                  <div className="preview-text" dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }} />
                </div>
              </div>
              <div className="preview-actions">
                <button 
                  type="button" 
                  onClick={handlePreviewClose}
                  className="action-btn secondary-btn"
                >
                  Edit Article
                </button>
                <button 
                  type="button" 
                  onClick={async () => {
                    setShowPreview(false);
                    await handleUpdateConfirm();
                  }}
                  className="action-btn publish-btn"
                  disabled={editLocked}
                >
                  <Save size={18} />
                  Update Article
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Confirmation Modal */}
        {showUpdateConfirm && (
          <div className="modal-overlay">
            <div className="confirm-modal">
              <div className="confirm-modal-header">
                <h3>Ready to Update?</h3>
              </div>
              <div className="confirm-content">
                <div className="confirm-article-info">
                  <h4>{title}</h4>
                  <div className="confirm-stats">
                    <span>Price: <strong>${parseFloat(price).toFixed(2)}</strong></span>
                    <span>Read time: <strong>{calculateReadTime(content)}</strong></span>
                    <span>Word count: <strong>{wordCount} words</strong></span>
                  </div>
                </div>
                <p className="confirm-message">
                  Your article will be updated with the new content. 
                  This will overwrite the existing article.
                </p>
              </div>
              <div className="confirm-actions">
                <button 
                  type="button" 
                  onClick={() => setShowUpdateConfirm(false)}
                  className="action-btn secondary-btn"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleUpdateArticle}
                  className="action-btn publish-btn"
                  disabled={isSubmitting || editLocked}
                >
                  <CheckCircle size={18} />
                  {isSubmitting ? 'Updating...' : 'Confirm & Update'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EditArticle;
