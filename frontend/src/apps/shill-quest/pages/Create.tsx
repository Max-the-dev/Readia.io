import { useState, useEffect } from 'react';
import { Plus, Eye, FileText, DollarSign, Calendar, Settings, Zap, Users, Clock, Award, Target, ChevronRight, Globe, Link, Twitter, MessageCircle, X, Wallet, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { useShillWallet } from '../contexts/ShillWalletContext';

type PreviewTab = 'card' | 'page';

interface AdditionalLink {
  type: string;
  url: string;
}

interface QuestFormData {
  // Project Details
  projectName: string;
  tokenTicker: string;
  websiteUrl: string;
  xUrl: string;
  telegramUrl: string;
  discordUrl: string;
  additionalLinks: AdditionalLink[];
  // Quest Details
  title: string;
  description: string;
  contentType: string;
  category: string;
  keywords: string;
  // Rewards
  payoutPerPost: string;
  totalBudget: string;
  bonusAmount: string;
  bonusThreshold: string;
  bonusMetric: string;
  // Payout
  fundingWallet: string;
  useConnectedWallet: boolean;
  // Timeline & Settings
  startDate: string;
  endDate: string;
  reviewMode: 'auto' | 'manual';
}

function Create() {
  const { address: connectedWallet, isConnected, usdcBalance } = useShillWallet();
  const [previewTab, setPreviewTab] = useState<PreviewTab>('card');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState<QuestFormData>({
    // Project Details
    projectName: '',
    tokenTicker: '',
    websiteUrl: '',
    xUrl: '',
    telegramUrl: '',
    discordUrl: '',
    additionalLinks: [],
    // Quest Details
    title: '',
    description: '',
    contentType: 'X Thread',
    category: 'Token Launch',
    keywords: '',
    // Rewards
    payoutPerPost: '',
    totalBudget: '',
    bonusAmount: '',
    bonusThreshold: '',
    bonusMetric: 'likes',
    // Payout
    fundingWallet: '',
    useConnectedWallet: true,
    // Timeline & Settings
    startDate: '',
    endDate: '',
    reviewMode: 'auto',
  });

  const updateField = (field: keyof QuestFormData, value: string | AdditionalLink[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addAdditionalLink = () => {
    setFormData((prev) => ({
      ...prev,
      additionalLinks: [...prev.additionalLinks, { type: 'GitHub', url: '' }],
    }));
  };

  const updateAdditionalLink = (index: number, field: 'type' | 'url', value: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      ),
    }));
  };

  const removeAdditionalLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      additionalLinks: prev.additionalLinks.filter((_, i) => i !== index),
    }));
  };

  // Calculate derived values for preview
  const maxSubmissions = formData.totalBudget && formData.payoutPerPost
    ? Math.floor(parseFloat(formData.totalBudget) / parseFloat(formData.payoutPerPost)) || 0
    : 0;

  const hasBonus = formData.bonusAmount && formData.bonusThreshold;

  return (
    <div className="create-quest-page">
      {/* Header outside the grid layout */}
      <div className="create-quest-header">
        <h1>
          <Plus size={24} />
          Create Quest
        </h1>
        <p>Launch a campaign and pay creators for approved content</p>
      </div>

      <div className="create-quest-layout">
        {/* Left Panel - Input Sections */}
        <div className="create-quest-form">
          {/* Section 1: Project/Token Details */}
          <div className="form-section">
            <div className="section-title">
              <Globe size={18} />
              <span>Project Details</span>
            </div>

            <div className="form-field-row">
              <div className="form-field">
                <label>Project Name</label>
                <input
                  type="text"
                  placeholder="e.g., Readia"
                  value={formData.projectName}
                  onChange={(e) => updateField('projectName', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>
                  Ticker
                  <span className="label-optional">(if applicable)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., $READ"
                  value={formData.tokenTicker}
                  onChange={(e) => updateField('tokenTicker', e.target.value)}
                />
              </div>
            </div>

            <div className="form-subsection">
              <span className="subsection-label">Required Links</span>
              <div className="form-field">
                <label>
                  <Twitter size={14} />
                  X (Twitter)
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/yourproject"
                  value={formData.xUrl}
                  onChange={(e) => updateField('xUrl', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>
                  <Globe size={14} />
                  Website
                </label>
                <input
                  type="url"
                  placeholder="https://yourproject.com"
                  value={formData.websiteUrl}
                  onChange={(e) => updateField('websiteUrl', e.target.value)}
                />
              </div>
            </div>

            <div className="form-subsection">
              <span className="subsection-label">
                Community Links
                <span className="label-optional">(optional)</span>
              </span>
              <div className="form-field-row">
                <div className="form-field">
                  <label>
                    <MessageCircle size={14} />
                    Telegram
                  </label>
                  <input
                    type="url"
                    placeholder="https://t.me/yourproject"
                    value={formData.telegramUrl}
                    onChange={(e) => updateField('telegramUrl', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>
                    <MessageCircle size={14} />
                    Discord
                  </label>
                  <input
                    type="url"
                    placeholder="https://discord.gg/yourserver"
                    value={formData.discordUrl}
                    onChange={(e) => updateField('discordUrl', e.target.value)}
                  />
                </div>
              </div>
              <div className="additional-links">
                <div className="additional-links-header">
                  <label>
                    <Link size={14} />
                    Additional Links
                  </label>
                  <button
                    type="button"
                    className="add-link-btn"
                    onClick={addAdditionalLink}
                  >
                    <Plus size={14} />
                    Add Link
                  </button>
                </div>
                {formData.additionalLinks.map((link, index) => (
                  <div className="additional-link-row" key={index}>
                    <select
                      className="link-type-select"
                      value={link.type}
                      onChange={(e) => updateAdditionalLink(index, 'type', e.target.value)}
                    >
                      <option>GitHub</option>
                      <option>Documentation</option>
                      <option>YouTube</option>
                      <option>Linktree</option>
                      <option>Other</option>
                    </select>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateAdditionalLink(index, 'url', e.target.value)}
                    />
                    <button
                      type="button"
                      className="remove-link-btn"
                      onClick={() => removeAdditionalLink(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Quest Details */}
          <div className="form-section">
            <div className="section-title">
              <FileText size={18} />
              <span>Quest Details</span>
            </div>

            <div className="form-field">
              <label>Title</label>
              <input
                type="text"
                placeholder="e.g., Promote $READ Token Launch"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Description</label>
              <textarea
                rows={3}
                placeholder="What should creators post about? Be specific about requirements..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
              />
            </div>

            <div className="form-field-row">
              <div className="form-field">
                <label>Content Type</label>
                <select
                  value={formData.contentType}
                  onChange={(e) => updateField('contentType', e.target.value)}
                >
                  <option>X Thread</option>
                  <option>X Post</option>
                  <option>Video</option>
                  <option>Article (Readia)</option>
                </select>
              </div>
              <div className="form-field">
                <label>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => updateField('category', e.target.value)}
                >
                  <option>Token Launch</option>
                  <option>Product Launch</option>
                  <option>New Feature</option>
                  <option>Partnership</option>
                  <option>Airdrop</option>
                  <option>Event</option>
                </select>
              </div>
            </div>

            <div className="form-field">
              <label>Required Keywords</label>
              <input
                type="text"
                placeholder="$READ, Readia, #micropayments"
                value={formData.keywords}
                onChange={(e) => updateField('keywords', e.target.value)}
              />
              <span className="field-hint">Comma-separated. Content must include these.</span>
            </div>
          </div>

          {/* Section 2: Rewards */}
          <div className="form-section">
            <div className="section-title">
              <DollarSign size={18} />
              <span>Rewards</span>
            </div>

            <div className="form-field-row">
              <div className="form-field">
                <label>Payout per Post</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    placeholder="5.00"
                    step="0.01"
                    min="0.01"
                    value={formData.payoutPerPost}
                    onChange={(e) => updateField('payoutPerPost', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Total Budget</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    placeholder="500.00"
                    step="1"
                    min="10"
                    value={formData.totalBudget}
                    onChange={(e) => updateField('totalBudget', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {maxSubmissions > 0 && (
              <div className="budget-indicator">
                <Users size={14} />
                <span>Up to <strong>{maxSubmissions}</strong> submissions can be approved</span>
              </div>
            )}

            <div className="form-field">
              <label>
                Engagement Bonus
                <span className="label-optional">(optional)</span>
              </label>
              <div className="bonus-config">
                <div className="input-with-prefix compact">
                  <span className="input-prefix">+$</span>
                  <input
                    type="number"
                    placeholder="25"
                    value={formData.bonusAmount}
                    onChange={(e) => updateField('bonusAmount', e.target.value)}
                  />
                </div>
                <span className="bonus-text">if post reaches</span>
                <input
                  type="number"
                  placeholder="1000"
                  className="compact-input"
                  value={formData.bonusThreshold}
                  onChange={(e) => updateField('bonusThreshold', e.target.value)}
                />
                <select
                  className="compact-select"
                  value={formData.bonusMetric}
                  onChange={(e) => updateField('bonusMetric', e.target.value)}
                >
                  <option value="likes">likes</option>
                  <option value="retweets">retweets</option>
                  <option value="views">views</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Payout Details */}
          <div className="form-section">
            <div className="section-title">
              <Wallet size={18} />
              <span>Payout Details</span>
            </div>

            <div className="payout-method-info">
              <div className="payout-method-badge">
                <Zap size={14} />
                <span>Direct x402 Transfer</span>
              </div>
              <p>Payments are sent directly from your wallet to creators when submissions are approved.</p>
            </div>

            <div className="form-field">
              <label>Funding Wallet</label>
              <div className="wallet-toggle">
                <label className={`wallet-option ${formData.useConnectedWallet ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="walletChoice"
                    checked={formData.useConnectedWallet}
                    onChange={() => updateField('useConnectedWallet', 'true')}
                  />
                  <span>Use connected wallet</span>
                  {isConnected && connectedWallet && (
                    <span className="wallet-address-preview">
                      {connectedWallet.slice(0, 6)}...{connectedWallet.slice(-4)}
                    </span>
                  )}
                </label>
                <label className={`wallet-option ${!formData.useConnectedWallet ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="walletChoice"
                    checked={!formData.useConnectedWallet}
                    onChange={() => updateField('useConnectedWallet', '')}
                  />
                  <span>Use different wallet</span>
                </label>
              </div>
              {!formData.useConnectedWallet && (
                <input
                  type="text"
                  placeholder="Enter wallet address (0x... or SOL address)"
                  value={formData.fundingWallet}
                  onChange={(e) => updateField('fundingWallet', e.target.value)}
                  className="custom-wallet-input"
                />
              )}
            </div>

            {isConnected && usdcBalance && formData.totalBudget && (
              <div className={`balance-check ${parseFloat(usdcBalance) >= parseFloat(formData.totalBudget) ? 'sufficient' : 'insufficient'}`}>
                <div className="balance-info">
                  <span className="balance-label">Wallet Balance:</span>
                  <span className="balance-value">{usdcBalance} USDC</span>
                </div>
                {parseFloat(usdcBalance) < parseFloat(formData.totalBudget) && (
                  <div className="balance-warning">
                    <AlertCircle size={14} />
                    <span>Insufficient balance for total budget</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Timeline */}
          <div className="form-section">
            <div className="section-title">
              <Calendar size={18} />
              <span>Timeline</span>
            </div>

            <div className="form-field-row">
              <div className="form-field">
                <label>Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                />
              </div>
              <div className="form-field">
                <label>End Date</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => updateField('endDate', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Settings */}
          <div className="form-section">
            <div className="section-title">
              <Settings size={18} />
              <span>Review Settings</span>
            </div>

            <div className="review-options">
              <label
                className={`review-option ${formData.reviewMode === 'auto' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="review"
                  checked={formData.reviewMode === 'auto'}
                  onChange={() => updateField('reviewMode', 'auto')}
                />
                <div className="option-content">
                  <Zap size={18} />
                  <div>
                    <span className="option-title">Auto-approve</span>
                    <span className="option-desc">Approve if all requirements pass</span>
                  </div>
                </div>
              </label>
              <label
                className={`review-option ${formData.reviewMode === 'manual' ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="review"
                  checked={formData.reviewMode === 'manual'}
                  onChange={() => updateField('reviewMode', 'manual')}
                />
                <div className="option-content">
                  <Eye size={18} />
                  <div>
                    <span className="option-title">Manual review</span>
                    <span className="option-desc">Review each submission yourself</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button className="btn-secondary">Save Draft</button>
            <button className="btn-primary" onClick={() => setShowConfirmModal(true)}>
              <DollarSign size={18} />
              Fund & Launch
            </button>
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div className="create-quest-preview">
          <div className="preview-header">
            <span className="preview-label">Preview</span>
            <div className="preview-tabs">
              <button
                className={`preview-tab ${previewTab === 'card' ? 'active' : ''}`}
                onClick={() => setPreviewTab('card')}
              >
                Card
              </button>
              <button
                className={`preview-tab ${previewTab === 'page' ? 'active' : ''}`}
                onClick={() => setPreviewTab('page')}
              >
                Page
              </button>
            </div>
          </div>

          <div className="preview-content">
            {previewTab === 'card' ? (
              <QuestCardPreview formData={formData} hasBonus={!!hasBonus} />
            ) : (
              <QuestPagePreview formData={formData} maxSubmissions={maxSubmissions} hasBonus={!!hasBonus} connectedWallet={connectedWallet} />
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Quest Launch</h2>
              <button className="modal-close" onClick={() => setShowConfirmModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="confirm-section">
                <h4>Quest Summary</h4>
                <div className="confirm-details">
                  <div className="confirm-row">
                    <span className="confirm-label">Project</span>
                    <span className="confirm-value">{formData.projectName || '—'} {formData.tokenTicker && `(${formData.tokenTicker})`}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Quest Title</span>
                    <span className="confirm-value">{formData.title || '—'}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Category</span>
                    <span className="confirm-value">{formData.category}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Content Type</span>
                    <span className="confirm-value">{formData.contentType}</span>
                  </div>
                </div>
              </div>

              <div className="confirm-section">
                <h4>Budget & Payouts</h4>
                <div className="confirm-details">
                  <div className="confirm-row">
                    <span className="confirm-label">Per Post</span>
                    <span className="confirm-value highlight">${formData.payoutPerPost || '0.00'}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Total Budget</span>
                    <span className="confirm-value highlight">${formData.totalBudget || '0.00'}</span>
                  </div>
                  <div className="confirm-row">
                    <span className="confirm-label">Max Submissions</span>
                    <span className="confirm-value">{maxSubmissions || '—'}</span>
                  </div>
                  {hasBonus && (
                    <div className="confirm-row">
                      <span className="confirm-label">Bonus</span>
                      <span className="confirm-value">+${formData.bonusAmount} at {formData.bonusThreshold}+ {formData.bonusMetric}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="confirm-section">
                <h4>Funding Wallet</h4>
                <div className="confirm-wallet">
                  <Wallet size={18} />
                  <span className="wallet-full-address">
                    {formData.useConnectedWallet
                      ? (connectedWallet || 'No wallet connected')
                      : (formData.fundingWallet || 'No wallet specified')}
                  </span>
                </div>
                {isConnected && usdcBalance && (
                  <div className="confirm-balance">
                    <span>Available: {usdcBalance} USDC</span>
                    {formData.totalBudget && parseFloat(usdcBalance) < parseFloat(formData.totalBudget) && (
                      <span className="balance-warning-inline">
                        <AlertCircle size={14} />
                        Insufficient funds
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="confirm-section">
                <h4>Terms</h4>
                <div className="payout-notes">
                  <p className="payout-note">
                    Payments for approved submissions will be sent to creators automatically via the Coinbase x402 facilitator.
                  </p>
                  <p className="cancel-note">
                    You can cancel your quest at any time. Unused budget remains in your wallet.
                  </p>
                </div>
                <div className="terms-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span>
                      I agree to the <a href="#" onClick={(e) => e.preventDefault()}>Terms & Conditions</a> and understand how payouts work
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                disabled={!termsAccepted}
                onClick={() => {
                  setShowConfirmModal(false);
                  setShowSuccessModal(true);
                  setTermsAccepted(false);
                }}
              >
                <Check size={18} />
                Confirm & Launch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <SuccessModal
          questTitle={formData.title}
          onClose={() => setShowSuccessModal(false)}
        />
      )}
    </div>
  );
}

// Success Modal Component
function SuccessModal({ questTitle, onClose }: { questTitle: string; onClose: () => void }) {
  const [countdown, setCountdown] = useState(5);

  // Auto-redirect countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Would redirect here: navigate('/shill/quest/123');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="modal-overlay">
      <div className="modal-content success-modal">
        <div className="success-icon">
          <Check size={48} />
        </div>
        <h2>Quest Launched!</h2>
        <p className="success-message">
          <strong>{questTitle || 'Your quest'}</strong> is now live and accepting submissions.
        </p>
        <div className="success-actions">
          <button className="btn-primary" onClick={onClose}>
            <ExternalLink size={18} />
            View Quest Page
          </button>
        </div>
        <p className="redirect-notice">
          Redirecting in {countdown} seconds...
        </p>
      </div>
    </div>
  );
}

// Quest Card Preview Component
function QuestCardPreview({ formData, hasBonus }: { formData: QuestFormData; hasBonus: boolean }) {
  const displayTitle = formData.title || 'Your Quest Title';
  const displayDescription = formData.description || 'Quest description will appear here...';
  const displayPayout = formData.payoutPerPost ? parseFloat(formData.payoutPerPost).toFixed(2) : '0.00';
  const displayBonusAmount = formData.bonusAmount ? parseFloat(formData.bonusAmount) : 0;

  // Extract @handle from X URL
  const extractHandle = (url: string) => {
    if (!url) return 'yourproject';
    const match = url.match(/(?:x\.com|twitter\.com)\/([^\/\?]+)/);
    return match ? match[1] : 'yourproject';
  };
  const handle = extractHandle(formData.xUrl);

  // For new quests, budgetUsed is 0
  const budgetUsed = 0;
  const totalBudget = formData.totalBudget ? parseFloat(formData.totalBudget) : 0;
  const progress = totalBudget > 0 ? Math.min((budgetUsed / totalBudget) * 100, 100) : 0;

  return (
    <div className="quest-card-preview">
      <div className="quest-card">
        {/* Badge Row */}
        <div className="quest-card-badges">
          <span className="quest-card-category">{formData.category}</span>
          {hasBonus && displayBonusAmount > 0 && (
            <span className="quest-card-bonus">+${displayBonusAmount}</span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="quest-card-title">{displayTitle}</h3>
        <p className="quest-card-desc">{displayDescription}</p>

        {/* Divider */}
        <div className="quest-card-divider" />

        {/* Footer Row 1: Handle & Payout */}
        <div className="quest-card-footer-row">
          <span className="quest-card-handle">by @{handle}</span>
          <span className="quest-card-payout">${displayPayout}/task</span>
        </div>

        {/* Footer Row 2: Content Type & Progress */}
        <div className="quest-card-footer-row">
          <span className="quest-card-type">{formData.contentType}</span>
          <div className="quest-card-progress">
            <div className="quest-card-progress-bar">
              <div
                className="quest-card-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="quest-card-progress-text">
              ${budgetUsed}/${totalBudget || 0}
            </span>
          </div>
        </div>
      </div>
      <p className="preview-hint">This is how your quest appears in the explore grid</p>
    </div>
  );
}

// Quest Page Preview Component
function QuestPagePreview({ formData, maxSubmissions, hasBonus, connectedWallet }: { formData: QuestFormData; maxSubmissions: number; hasBonus: boolean; connectedWallet: string | undefined }) {
  const displayTitle = formData.title || 'Your Quest Title';
  const displayDescription = formData.description || 'Add a description to see it here...';
  const displayPayout = formData.payoutPerPost ? `$${parseFloat(formData.payoutPerPost).toFixed(2)}` : '$0.00';
  const displayBudget = formData.totalBudget ? `$${parseFloat(formData.totalBudget).toFixed(2)}` : '$0.00';
  const keywords = formData.keywords.split(',').map((k) => k.trim()).filter(Boolean);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="quest-page-preview">
      <div className="quest-page-header">
        <div className="quest-page-badges">
          <span className="quest-category">{formData.category}</span>
          <span className="quest-type-badge">{formData.contentType}</span>
        </div>
        <h2 className="quest-page-title">{displayTitle}</h2>
        <p className="quest-page-desc">{displayDescription}</p>
      </div>

      <div className="quest-page-stats">
        <div className="stat-item">
          <DollarSign size={16} />
          <div>
            <span className="stat-value">{displayPayout}</span>
            <span className="stat-label">per post</span>
          </div>
        </div>
        <div className="stat-item">
          <Target size={16} />
          <div>
            <span className="stat-value">{displayBudget}</span>
            <span className="stat-label">total budget</span>
          </div>
        </div>
        <div className="stat-item">
          <Users size={16} />
          <div>
            <span className="stat-value">{maxSubmissions || '—'}</span>
            <span className="stat-label">max submissions</span>
          </div>
        </div>
        {hasBonus && (
          <div className="stat-item bonus">
            <Award size={16} />
            <div>
              <span className="stat-value">+${formData.bonusAmount}</span>
              <span className="stat-label">{formData.bonusThreshold}+ {formData.bonusMetric}</span>
            </div>
          </div>
        )}
      </div>

      <div className="quest-page-section">
        <h4>
          <Clock size={14} />
          Timeline
        </h4>
        <div className="timeline-display">
          <span>{formatDate(formData.startDate)}</span>
          <ChevronRight size={14} />
          <span>{formatDate(formData.endDate)}</span>
        </div>
      </div>

      {keywords.length > 0 && (
        <div className="quest-page-section">
          <h4>Required Keywords</h4>
          <div className="keywords-display">
            {keywords.map((kw, i) => (
              <span key={i} className="keyword-tag">{kw}</span>
            ))}
          </div>
        </div>
      )}

      <div className="quest-page-section">
        <h4>Review Mode</h4>
        <div className="review-mode-display">
          {formData.reviewMode === 'auto' ? (
            <>
              <Zap size={14} />
              <span>Auto-approve enabled</span>
            </>
          ) : (
            <>
              <Eye size={14} />
              <span>Manual review required</span>
            </>
          )}
        </div>
      </div>

      <div className="quest-page-section payout-section">
        <h4>
          <Wallet size={14} />
          Payout Info
        </h4>
        <div className="payout-info-display">
          <div className="payout-info-row">
            <span className="payout-info-label">Method</span>
            <span className="payout-info-value">
              <Zap size={12} />
              Direct x402 Transfer
            </span>
          </div>
          <div className="payout-info-row">
            <span className="payout-info-label">Funded by</span>
            <span className="payout-info-value wallet-addr">
              {formData.useConnectedWallet
                ? (connectedWallet ? `${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}` : 'Wallet not connected')
                : (formData.fundingWallet ? `${formData.fundingWallet.slice(0, 6)}...${formData.fundingWallet.slice(-4)}` : 'Not specified')}
            </span>
          </div>
        </div>
      </div>

      <button className="submit-preview-btn">
        Submit Content
        <ChevronRight size={16} />
      </button>

      <p className="preview-hint">This is the full quest page creators will see</p>
    </div>
  );
}

export default Create;
