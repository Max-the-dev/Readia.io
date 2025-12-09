import { Quest } from '../types';

export const mockQuests: Quest[] = [
  {
    id: 'read-launch',
    // Project Info
    projectName: 'Readia',
    xUrl: 'https://x.com/Readia_io',
    tokenTicker: '$READ',
    websiteUrl: 'https://readia.io',
    telegramUrl: 'https://t.me/readia',
    // Quest Details
    title: 'Promote the $READ Token Launch',
    description: "Create a Twitter thread about Readia's micropayment revolution and how x402 enables instant creator payments. Be authentic and creative!",
    contentType: 'X Thread',
    category: 'Token Launch',
    keywords: ['$READ', 'Readia', '#micropayments', '#x402'],
    // Rewards
    payoutPerPost: 10,
    totalBudget: 500,
    budgetUsed: 120,
    bonusAmount: 25,
    bonusThreshold: 1000,
    bonusMetric: 'likes',
    // Payout
    fundingWallet: '0x1234567890abcdef1234567890abcdef12345678',
    // Timeline
    startDate: '2025-01-15',
    endDate: '2025-02-15',
    // Settings
    reviewMode: 'auto',
    // Stats
    submissionsCount: 15,
    submissionsPaid: 12,
    // Engagement
    hot: true,
  },
  {
    id: 'defi-staking',
    projectName: 'DeFi Protocol',
    xUrl: 'https://x.com/DeFiProtocol',
    tokenTicker: '$DFP',
    websiteUrl: 'https://defiprotocol.xyz',
    title: 'Explain Staking Mechanism',
    description: 'Create educational content about our staking system with APY examples and calculations. Show how users can maximize returns.',
    contentType: 'Video',
    category: 'New Feature',
    keywords: ['$DFP', 'staking', 'APY', 'DeFi'],
    payoutPerPost: 15,
    totalBudget: 750,
    budgetUsed: 180,
    bonusAmount: 50,
    bonusThreshold: 5000,
    bonusMetric: 'views',
    fundingWallet: '0xabcdef1234567890abcdef1234567890abcdef12',
    startDate: '2025-01-10',
    endDate: '2025-02-10',
    reviewMode: 'manual',
    submissionsCount: 14,
    submissionsPaid: 12,
    hot: false,
  },
];
