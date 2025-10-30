import { useState, useEffect, FormEvent } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Save, Send, FileText, Clock, Eye, CheckCircle, X } from 'lucide-react';
import { getCurrentDateString } from '../utils/dateUtils';
import { apiService, Draft } from '../services/api';
import { Editor } from '@tinymce/tinymce-react';

function Write() {
  const { isConnected, address } = useWallet();
  
  // Available categories (same as in Explore page)
  const availableCategories = [
    'Technology',
    'Crypto', 
    'AI & Machine Learning',
    'Web Development',
    'Blockchain',
    'Startup',
    'Business',
    'Finance',
    'Science',
    'Programming',
    'Design',
    'Marketing',
    'Productivity',
    'Security',
    'Data Science'
  ];

  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDraft, setIsDraft] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [availableDrafts, setAvailableDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState<boolean>(false);
  const [loadingDrafts, setLoadingDrafts] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState<boolean>(false);
  
  // Content limits
  const MAX_TITLE_LENGTH = 200;
  const MAX_CONTENT_LENGTH = 50000; // ~25-30 pages of text
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  
  // Typing animation state
  const [displayText, setDisplayText] = useState<string>('');
  const [hasTyped, setHasTyped] = useState<boolean>(false);
  const fullText = "Your words can change the world.";

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
      } else {
        return [...prev, category];
      }
    });
  };

  // Real-time validation (only update errors, don't show them yet)
  useEffect(() => {
    const errors = validateForm();
    setValidationErrors(errors);
    // Clear submit error when validation changes and no errors
    if (submitError && errors.length === 0 && showValidation) {
      setSubmitError('');
    }
  }, [title, content, price, submitError, showValidation]);

  // Auto-save functionality
  useEffect(() => {
    if (!address || (!title && !content)) return; // Don't auto-save empty content or when not connected
    
    const autoSaveTimer = setTimeout(async () => {
      try {
        await apiService.saveDraft({
          title,
          content,
          price: parseFloat(price) || 0.05,
          authorAddress: address,
          isAutoSave: true
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 5000); // Auto-save after 5 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [title, content, price, address]);

  // Load available drafts when connected
  useEffect(() => {
    if (address) {
      loadDrafts();
    }
  }, [address]);



  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Show validation from now on
    setShowValidation(true);
    
    if (!address) {
      setSubmitError('Please connect your wallet first');
      return;
    }

    // Check for validation errors
    const errors = validateForm();
    if (errors.length > 0) {
      setSubmitError('Please fix the validation errors above before publishing');
      return;
    }

    // Show confirmation modal instead of publishing immediately
    setShowPublishConfirm(true);
  };

  const handlePublishConfirm = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);
    setShowPublishConfirm(false);

    try {
      const articleData = {
        title,
        content,
        price: parseFloat(price),
        authorAddress: address!,
        categories: selectedCategories
      };

      const response = await apiService.createArticle(articleData);

      if (response.success) {
        setSubmitSuccess(true);
        
        // Clean up drafts that match the published article
        try {
          const matchingDrafts = availableDrafts.filter(draft => 
            draft.title.trim() === title.trim() && 
            draft.content.trim() === content.trim()
          );
          
          for (const draft of matchingDrafts) {
            await apiService.deleteDraft(draft.id, address!);
          }
          
          // Update local drafts state to remove deleted drafts
          setAvailableDrafts(prev => prev.filter(draft => 
            !matchingDrafts.some(matchingDraft => matchingDraft.id === draft.id)
          ));
        } catch (error) {
          console.error('Error cleaning up matching drafts:', error);
          // Don't fail the publication if draft cleanup fails
        }
        
        // Clear current form
        setTitle('');
        setContent('');
        setPrice('0.05');
        setShowValidation(false);
      } else {
        setSubmitError(response.error || 'Failed to create article');
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred');
      console.error('Error creating article:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePreview = (content: string) => {
    // Remove HTML tags for preview
    const textContent = content.replace(/<[^>]*>/g, '');
    return textContent.substring(0, 300) + (textContent.length > 300 ? '...' : '');
  };

  const estimateReadTime = (content: string) => {
    const wordsPerMinute = 200;
    const textContent = content.replace(/<[^>]*>/g, '');
    const wordCount = textContent.trim().split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  // Validation helper
  const validateForm = () => {
    const errors: string[] = [];
    
    if (!title.trim()) {
      errors.push('Article title is required');
    }
    
    if (!content.trim()) {
      errors.push('Article content is required');
    }
    
    if (!price || parseFloat(price) <= 0) {
      errors.push('Valid price is required');
    }
    
    if (title.length > MAX_TITLE_LENGTH) {
      errors.push(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
    }
    
    if (content.length > MAX_CONTENT_LENGTH) {
      errors.push(`Content must be ${MAX_CONTENT_LENGTH} characters or less`);
    }
    
    const priceNum = parseFloat(price);
    if (price && priceNum < 0.01) {
      errors.push('Article price must be at least $0.01');
    }
    
    if (price && priceNum > 1.00) {
      errors.push('Article price cannot exceed $1.00');
    }
    
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

      if (response.success) {
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
    console.log('Loaded draft:', draft);
  };

  const deleteDraft = async (draftId: number) => {
    if (!address) return;

    try {
      const response = await apiService.deleteDraft(draftId, address);
      if (response.success) {
        setAvailableDrafts(prev => prev.filter(d => d.id !== draftId));
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };


  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;

  if (!isConnected) {
    return (
      <div className="write">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to start writing and publishing articles on Penny.io</p>
            <ConnectButton />
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
          <form id="write-form" onSubmit={handleSubmit} className="write-form">
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

            {/* Action Buttons */}
            <div className="article-actions">
              <div className="draft-actions">
                <button 
                  type="button" 
                  onClick={() => {
                    if (showDrafts) {
                      setShowDrafts(false);
                    } else {
                      loadDrafts();
                      setShowDrafts(true);
                    }
                  }}
                  className="action-btn draft-btn"
                  disabled={loadingDrafts}
                >
                  <FileText size={18} />
                  {loadingDrafts ? 'Loading...' : 'Load Draft'}
                </button>
                <button 
                  type="button" 
                  onClick={saveDraft}
                  className="action-btn save-btn"
                  disabled={isDraft}
                >
                  <Save size={18} />
                  {isDraft ? 'Saved!' : 'Save Draft'}
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
                type="submit" 
                className="action-btn publish-btn"
                disabled={isSubmitting}
              >
                <Send size={18} />
                {isSubmitting ? 'Publishing...' : 'Publish Article'}
              </button>
            </div>

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
                            {draft.content ? draft.content.substring(0, 100) + '...' : 'No content'}
                          </p>
                          <div className="draft-meta">
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
                        <span className="preview-word-count">{content.trim().split(/\s+/).filter(word => word.length > 0).length} words</span>
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
                    onChange={(e) => setPrice(e.target.value)}
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    placeholder="0.05"
                    required
                  />
                </div>
              </div>

              {/* Categories Section */}
              <div className="categories-section">
                <label className="input-label">Categories (Optional)</label>
                <p className="categories-description">
                  Select categories that best describe your article. This helps readers discover your content.
                </p>
                <div className="categories-grid">
                  {availableCategories.map(category => (
                    <button
                      key={category}
                      type="button"
                      className={`category-tag ${selectedCategories.includes(category) ? 'selected' : ''}`}
                      onClick={() => toggleCategory(category)}
                    >
                      {category}
                      {selectedCategories.includes(category) && <span className="check-mark">✓</span>}
                    </button>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="selected-categories-summary">
                    <span className="selected-count">{selectedCategories.length} selected:</span>
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
                  onEditorChange={(content) => setContent(content)}
                  init={{
                    height: 700,
                    menubar: false,
                    resize: false,
                    statusbar: false,
                    plugins: [
                      'image', 'link', 'lists', 'code', 'table', 'media', 'codesample', 'autolink', 'powerpaste', 'wordcount'
                    ],
                    toolbar: 'undo redo | blocks | bold italic underline | link image media table | code codesample | bullist numlist outdent indent | removeformat',
                    
                    // Image upload configuration
                    images_upload_url: 'http://localhost:3001/api/upload',
                    images_upload_base_path: 'http://localhost:3001',
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

            {/* Validation Status - only show after publish attempt */}
            {showValidation && (
              validationErrors.length > 0 ? (
                <div className="validation-errors">
                  <h4>Please fix the following issues:</h4>
                  <ul>
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="validation-success">
                  <h4>✅ Ready to publish!</h4>
                  <p>Your article looks good and is ready to be published.</p>
                </div>
              )
            )}

            {/* Submit Error Message */}
            {submitError && validationErrors.length === 0 && (
              <div className="submit-error">
                {submitError}
              </div>
            )}


          </form>
        </div>
      </div>
    </div>
  );
}

export default Write;