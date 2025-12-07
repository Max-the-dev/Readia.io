export type QuestType = 'Twitter' | 'Video' | 'Thread' | 'Article' | 'Short' | 'Other';

export interface Quest {
  id: string;
  title: string;
  sponsor: string;
  description: string;
  payout: number;
  currency: string;
  spotsTaken: number;
  spotsTotal: number;
  tags: string[];
  daysLeft?: number;
  bonus?: string;
  category?: string;
  type?: QuestType;
  hot?: boolean;
}
