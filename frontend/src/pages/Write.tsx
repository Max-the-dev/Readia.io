import { useState, FormEvent } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Bold, Italic, Code, List, Hash, Eye, EyeOff, Save, Send } from 'lucide-react';
import { getCurrentDateString } from '../utils/dateUtils';
import { apiService } from '../services/api';

function Write() {
  const { isConnected, address } = useWallet();
  const [title, setTitle] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [price, setPrice] = useState<string>('0.05');
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [isDraft, setIsDraft] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!address) {
      setSubmitError('Please connect your wallet first');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');
    setSubmitSuccess(false);

    try {
      const articleData = {
        title,
        content,
        price: parseFloat(price),
        authorAddress: address
      };

      const response = await apiService.createArticle(articleData);

      if (response.success) {
        setSubmitSuccess(true);
        setTitle('');
        setContent('');
        setPrice('0.05');
        setTimeout(() => setSubmitSuccess(false), 5000);
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

  const saveDraft = () => {
    setIsDraft(true);
    console.log('Draft saved:', { title, content, price });
    setTimeout(() => setIsDraft(false), 2000);
  };

  // Format text with basic markdown support for preview
  const formatText = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .split('\n\n')
      .map(p => p.startsWith('<h') || p.startsWith('<ul') ? p : `<p>${p}</p>`)
      .join('');
  };

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = document.getElementById('content') as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newContent = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newContent);
    
    // Set cursor position after insertion
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  const wordCount = content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = content.length;

  if (!isConnected) {
    return (
      <div className="write">
        <div className="container">
          <div className="connect-prompt">
            <h1>Connect Your Wallet</h1>
            <p>Connect your wallet to start writing and publishing articles on Penny.io.</p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="write">
      <div className="write-container">
        {/* Header */}
        <div className="write-header">
          <div className="write-header-left">
            <h1>Write New Article</h1>
            <div className="write-stats">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>
          </div>
          <div className="write-header-right">
            <button 
              type="button" 
              onClick={() => setShowPreview(!showPreview)}
              className="preview-toggle"
            >
              {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button 
              type="button" 
              onClick={saveDraft}
              className="save-draft-btn"
              disabled={isDraft}
            >
              <Save size={18} />
              {isDraft ? 'Saved!' : 'Save Draft'}
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="write-layout">
          {/* Editor Panel */}
          <div className="write-editor">
            <form onSubmit={handleSubmit} className="write-form">
              {/* Title Input */}
              <div className="form-group">
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Article title..."
                  className="title-input"
                  required
                />
              </div>

              {/* Price Input */}
              <div className="form-group price-group">
                <label htmlFor="price">Article Price</label>
                <div className="price-input-wrapper">
                  <span className="price-symbol">$</span>
                  <input
                    type="number"
                    id="price"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    className="price-input"
                    required
                  />
                </div>
              </div>

              {/* Markdown Toolbar */}
              <div className="markdown-toolbar">
                <button
                  type="button"
                  onClick={() => insertMarkdown('**', '**')}
                  className="toolbar-btn"
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('*', '*')}
                  className="toolbar-btn"
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('`', '`')}
                  className="toolbar-btn"
                  title="Code"
                >
                  <Code size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('## ', '')}
                  className="toolbar-btn"
                  title="Heading"
                >
                  <Hash size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => insertMarkdown('- ', '')}
                  className="toolbar-btn"
                  title="List"
                >
                  <List size={16} />
                </button>
              </div>

              {/* Content Textarea */}
              <div className="form-group">
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start writing your article..."
                  className="content-textarea"
                  required
                />
              </div>

              {/* Error Message */}
              {submitError && (
                <div className="submit-error">
                  {submitError}
                </div>
              )}

              {/* Success Message */}
              {submitSuccess && (
                <div className="submit-success">
                  ✅ Article published successfully!
                </div>
              )}

              {/* Publish Button */}
              <button 
                type="submit" 
                className="publish-btn"
                disabled={isSubmitting || !title || !content}
              >
                <Send size={18} />
                {isSubmitting ? 'Publishing...' : 'Publish Article'}
              </button>
            </form>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="write-preview">
              <div className="preview-header">
                <h3>Preview</h3>
              </div>
              <div className="preview-content">
                {title && <h1 className="preview-title">{title}</h1>}
                {content && (
                  <div 
                    className="preview-body"
                    dangerouslySetInnerHTML={{ __html: formatText(content) }}
                  />
                )}
                {!title && !content && (
                  <p className="preview-empty">Start writing to see a preview...</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Write;