import { useLocation } from 'react-router-dom';
import { DollarSign, Users, Target, Award, ChevronRight, Zap, Eye, Wallet, Globe, Twitter, MessageCircle, Send, Calendar, Tag } from 'lucide-react';

// Mock data - will be replaced with actual DB hooks
const mockQuestData = {
  id: '1',
  // Project Details
  projectName: 'Readia',
  tokenTicker: '$READ',
  websiteUrl: 'https://readia.io',
  xUrl: 'https://x.com/Readia_io',
  telegramUrl: 'https://t.me/readia',
  discordUrl: '',
  // Quest Details
  title: 'Promote the $READ Token Launch',
  description: 'Create engaging content about the Readia micropayments platform and our upcoming token launch. Highlight the x402 payment protocol, instant payouts, and how creators can monetize their content. Be authentic and creative!',
  contentType: 'X Thread',
  category: 'Token Launch',
  keywords: ['$READ', 'Readia', '#micropayments', '#x402'],
  // Rewards
  payoutPerPost: 10,
  totalBudget: 500,
  bonusAmount: 25,
  bonusThreshold: 1000,
  bonusMetric: 'likes',
  // Payout
  fundingWallet: '0x1234567890abcdef1234567890abcdef12345678',
  // Timeline
  startDate: '2025-01-15',
  endDate: '2025-02-15',
  // Settings
  reviewMode: 'auto' as const,
  // Stats
  submissionsApproved: 12,
  maxSubmissions: 50,
};

function Quest() {
  const location = useLocation();

  // Extract questId from URL path: /shill/quest/:questId
  const pathParts = location.pathname.split('/');
  const questId = pathParts[pathParts.length - 1];

  // In the future, fetch quest data based on questId
  const quest = mockQuestData;

  // For debugging during development
  console.log('Quest ID:', questId);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatWallet = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  const spotsRemaining = quest.maxSubmissions - quest.submissionsApproved;
  const spotsClass = spotsRemaining <= 5 ? (spotsRemaining === 0 ? 'full' : 'limited') : '';

  const hasBonus = quest.bonusAmount && quest.bonusThreshold;

  return (
    <div className="quest-page">
      <div className="container">
        {/* Header */}
        <div className="quest-header">
          <div className="quest-header-badges">
            <span className="quest-category">{quest.category}</span>
            <span className="quest-type-badge">{quest.contentType}</span>
            {hasBonus && <span className="quest-bonus-badge">+Bonus Available</span>}
          </div>
          <h1>{quest.title}</h1>
          <p className="quest-header-desc">{quest.description}</p>
        </div>

        {/* Project Bar */}
        <div className="quest-project-bar">
          <div className="quest-project-info">
            <span className="quest-project-name">{quest.projectName}</span>
            {quest.tokenTicker && (
              <span className="quest-project-ticker">{quest.tokenTicker}</span>
            )}
          </div>
          <div className="quest-project-links">
            {quest.websiteUrl && (
              <a href={quest.websiteUrl} target="_blank" rel="noopener noreferrer" className="quest-project-link" title="Website">
                <Globe size={18} />
              </a>
            )}
            {quest.xUrl && (
              <a href={quest.xUrl} target="_blank" rel="noopener noreferrer" className="quest-project-link" title="X (Twitter)">
                <Twitter size={18} />
              </a>
            )}
            {quest.telegramUrl && (
              <a href={quest.telegramUrl} target="_blank" rel="noopener noreferrer" className="quest-project-link" title="Telegram">
                <MessageCircle size={18} />
              </a>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="quest-stats-grid">
          <div className="quest-stat-card">
            <DollarSign size={24} />
            <span className="quest-stat-value">${quest.payoutPerPost.toFixed(2)}</span>
            <span className="quest-stat-label">per post</span>
          </div>
          <div className="quest-stat-card">
            <Target size={24} />
            <span className="quest-stat-value">${quest.totalBudget.toFixed(2)}</span>
            <span className="quest-stat-label">total budget</span>
          </div>
          <div className="quest-stat-card">
            <Users size={24} />
            <span className="quest-stat-value">{quest.maxSubmissions}</span>
            <span className="quest-stat-label">max submissions</span>
          </div>
          {hasBonus && (
            <div className="quest-stat-card bonus">
              <Award size={24} />
              <span className="quest-stat-value">+${quest.bonusAmount}</span>
              <span className="quest-stat-label">{quest.bonusThreshold}+ {quest.bonusMetric}</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="quest-details">
          {/* Timeline */}
          <div className="quest-detail-card">
            <h3>
              <Calendar size={18} />
              Campaign Timeline
            </h3>
            <div className="quest-timeline">
              <div className="quest-timeline-date">
                <span>{formatDate(quest.startDate)}</span>
                <span>Start Date</span>
              </div>
              <ChevronRight size={20} />
              <div className="quest-timeline-date">
                <span>{formatDate(quest.endDate)}</span>
                <span>End Date</span>
              </div>
            </div>
          </div>

          {/* Required Keywords */}
          {quest.keywords.length > 0 && (
            <div className="quest-detail-card">
              <h3>
                <Tag size={18} />
                Required Keywords
              </h3>
              <div className="quest-keywords">
                {quest.keywords.map((kw, i) => (
                  <span key={i} className="quest-keyword">{kw}</span>
                ))}
              </div>
            </div>
          )}

          {/* Review Mode */}
          <div className="quest-detail-card">
            <h3>
              <Eye size={18} />
              Review Mode
            </h3>
            <div className="quest-review-mode">
              {quest.reviewMode === 'auto' ? (
                <>
                  <Zap size={20} />
                  <span>Auto-approve enabled - submissions are reviewed automatically</span>
                </>
              ) : (
                <>
                  <Eye size={20} />
                  <span>Manual review - the project team reviews each submission</span>
                </>
              )}
            </div>
          </div>

          {/* Payout Info */}
          <div className="quest-detail-card">
            <h3>
              <Wallet size={18} />
              Payout Information
            </h3>
            <div className="quest-payout-info">
              <div className="quest-payout-row">
                <span className="quest-payout-label">Payment Method</span>
                <span className="quest-payout-value">
                  <Zap size={14} />
                  Direct x402 Transfer
                </span>
              </div>
              <div className="quest-payout-row">
                <span className="quest-payout-label">Funded by</span>
                <span className="quest-payout-value wallet">
                  {formatWallet(quest.fundingWallet)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Submit CTA */}
        <div className="quest-submit-section">
          <h3>Ready to participate?</h3>
          <p>Create your content following the requirements above and submit for review.</p>
          <button className="quest-submit-btn">
            <Send size={20} />
            Submit Content
          </button>
          <div className={`quest-spots ${spotsClass}`}>
            <Users size={16} />
            {spotsRemaining === 0 ? (
              <span>No spots remaining</span>
            ) : (
              <span>{spotsRemaining} spots remaining</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Quest;
