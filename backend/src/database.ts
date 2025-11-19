/**
 * Supabase Database Class
 *
 * Replaces SQLite database.ts with PostgreSQL/Supabase implementation.
 * All methods maintain the same interface for drop-in replacement.
 *
 * Key differences from SQLite:
 * - Field names: snake_case in DB, camelCase in TypeScript
 * - JSONB: No JSON.parse() needed, already native
 * - Timestamps: TIMESTAMPTZ instead of ISO strings
 * - No table initialization needed (handled by migrations)
  */

import { supabase, pgPool } from './supabaseClient';
import { Article, Author, AuthorWallet, Draft, SupportedAuthorNetwork } from './types';
import { calculatePopularityScore } from './popularityScorer';
import { normalizeFlexibleAddress, tryNormalizeFlexibleAddress } from './utils/address';

class Database {
  constructor() {
    console.log('✅ Connected to Supabase PostgreSQL');
    // No table initialization needed - handled by migrations
  }

  /**
   * Helper: Convert DB row (snake_case) to Article (camelCase)
   */
  private parseArticleFromRow(row: any): Article {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      preview: row.preview,
      price: parseFloat(row.price),
      authorAddress: row.author_address,
      authorPrimaryNetwork: row.author_primary_network || undefined,
      authorSecondaryNetwork: row.author_secondary_network || undefined,
      authorSecondaryAddress: row.author_secondary_address || undefined,
      publishDate: row.publish_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      views: row.views || 0,
      purchases: row.purchases || 0,
      earnings: parseFloat(row.earnings) || 0,
      readTime: row.read_time,
      categories: row.categories || [], // Already parsed (JSONB)
      likes: row.likes || 0,
      popularityScore: parseFloat(row.popularity_score) || 0,
    };
  }

  /**
   * Helper: Convert DB row (snake_case) to Author (camelCase)
   */
  private parseAuthorFromRow(row: any, wallets: AuthorWallet[] = []): Author {
    const sortedWallets = [...wallets].sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const primaryWallet = sortedWallets.find(wallet => wallet.isPrimary) || null;
    const secondaryWallet = sortedWallets.find(wallet => !wallet.isPrimary) || null;
    const rowPrimaryNetwork = (row.primary_payout_network ||
      primaryWallet?.network ||
      'base') as SupportedAuthorNetwork;
    const rowSecondaryNetwork = (row.secondary_payout_network ||
      secondaryWallet?.network ||
      undefined) as SupportedAuthorNetwork | undefined;

    const supportedNetworks = Array.from(
      new Set(
        [
          rowPrimaryNetwork,
          rowSecondaryNetwork,
          ...sortedWallets.map(wallet => wallet.network),
        ].filter(Boolean)
      )
    ) as SupportedAuthorNetwork[];

    return {
      authorUuid: row.author_uuid,
      address: row.address,
      primaryPayoutNetwork: rowPrimaryNetwork,
      primaryPayoutAddress: primaryWallet?.address || row.address,
      secondaryPayoutNetwork: rowSecondaryNetwork,
      secondaryPayoutAddress: secondaryWallet?.address || row.secondary_payout_address || undefined,
      createdAt: row.created_at,
      totalEarnings: parseFloat(row.total_earnings) || 0,
      totalArticles: row.total_articles || 0,
      totalViews: row.total_views || 0,
      totalPurchases: row.total_purchases || 0,
      supportedNetworks,
      wallets: sortedWallets,
    };
  }

  /**
   * Helper: Convert DB row (snake_case) to Draft (camelCase)
   */
  private parseDraftFromRow(row: any): Draft {
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      price: parseFloat(row.price),
      authorAddress: row.author_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      isAutoSave: !!row.is_auto_save,
    };
  }

  private async fetchAuthorWallets(authorUuid?: string | null): Promise<AuthorWallet[]> {
    if (!authorUuid) {
      return [];
    }

    const { data, error } = await supabase
      .from('author_wallets')
      .select('*')
      .eq('author_uuid', authorUuid)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map(row => ({
      id: row.id,
      authorUuid: row.author_uuid,
      address: row.address,
      network: row.network as SupportedAuthorNetwork,
      isPrimary: !!row.is_primary,
      createdAt: row.created_at,
    }));
  }

  private async hydrateAuthorRow(row: any): Promise<Author> {
    const wallets = await this.fetchAuthorWallets(row.author_uuid);
    return this.parseAuthorFromRow(row, wallets);
  }

  private async findAuthorUuidByWallet(address: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('author_wallets')
      .select('author_uuid')
      .eq('address', address)
      .limit(1);

    if (error) {
      throw error;
    }

    const uuid = data && data.length > 0 ? data[0].author_uuid : null;
    return uuid;
  }

  private readonly articleSortColumnMap: Record<string, string> = {
    date: 'publish_date',
    publishDate: 'publish_date',
    title: 'title',
    price: 'price',
    earnings: 'earnings',
    views: 'views',
    likes: 'likes',
    purchases: 'purchases',
    popularityScore: 'popularity_score'
  };

  private escapeSearchTerm(term: string): string {
    return term
      .replace(/\\/g, '\\\\')
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/,/g, '\\,');
  }

  // ============================================
  // ARTICLE METHODS
  // ============================================

  async getArticles(options: {
    authorAddress?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Article[]> {
    const sortColumn = options.sortBy
      ? this.articleSortColumnMap[options.sortBy] || 'created_at'
      : 'created_at';
    const ascending = options.sortOrder === 'asc';

    let query = supabase.from('articles').select('*');

    if (options.authorAddress) {
      const normalizedAddress = normalizeFlexibleAddress(options.authorAddress);
      query = query.eq('author_address', normalizedAddress);
    }

    if (options.search) {
      const sanitized = this.escapeSearchTerm(options.search);
      query = query.or(`title.ilike.%${sanitized}%,content.ilike.%${sanitized}%`);
    }

    query = query.order(sortColumn, { ascending });

    if (sortColumn !== 'created_at') {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []).map(row => this.parseArticleFromRow(row));
  }

  async createArticle(article: Omit<Article, 'id'>): Promise<Article> {
    const normalizedAuthorAddress = normalizeFlexibleAddress(article.authorAddress);
    const primaryNetwork = article.authorPrimaryNetwork || 'base';

    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: article.title,
        content: article.content,
        preview: article.preview,
        price: article.price,
        author_address: normalizedAuthorAddress,
        author_primary_network: primaryNetwork,
        author_secondary_network: article.authorSecondaryNetwork || null,
        author_secondary_address: article.authorSecondaryAddress || null,
        publish_date: article.publishDate,
        created_at: article.createdAt,
        updated_at: article.updatedAt,
        views: article.views || 0,
        purchases: article.purchases || 0,
        earnings: article.earnings || 0,
        read_time: article.readTime,
        categories: article.categories || [],
        likes: article.likes || 0,
        popularity_score: article.popularityScore || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return this.parseArticleFromRow(data);
  }

  async getArticlesByAuthor(authorAddress: string, options?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; }): Promise<Article[]> {
    return this.getArticles({
      authorAddress,
      search: options?.search,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder
    });
  }

  async getArticleById(id: number): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    return this.parseArticleFromRow(data);
  }

  async getAllArticles(options?: { search?: string; sortBy?: string; sortOrder?: 'asc' | 'desc'; }): Promise<Article[]> {
    return this.getArticles({
      search: options?.search,
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder
    });
  }

  async updateArticle(
    id: number,
    updates: {
      title?: string;
      content?: string;
      preview?: string;
      price?: number;
      readTime?: string;
      updatedAt?: string;
      categories?: string[];
    }
  ): Promise<Article> {
    // Convert camelCase to snake_case
    const dbUpdates: any = {};
    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.preview !== undefined) dbUpdates.preview = updates.preview;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.readTime !== undefined) dbUpdates.read_time = updates.readTime;
    if (updates.updatedAt !== undefined) dbUpdates.updated_at = updates.updatedAt;
    if (updates.categories !== undefined) dbUpdates.categories = updates.categories;

    const { data, error } = await supabase
      .from('articles')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Article not found');
      throw error;
    }

    return this.parseArticleFromRow(data);
  }

  async deleteArticle(id: number): Promise<boolean> {
    const { error } = await supabase.from('articles').delete().eq('id', id);

    if (error) throw error;
    return true;
  }

  async updateArticleStats(
    id: number,
    views?: number,
    purchases?: number,
    earnings?: number
  ): Promise<void> {
    const updates: any = {};
    if (views !== undefined) updates.views = views;
    if (purchases !== undefined) updates.purchases = purchases;
    if (earnings !== undefined) updates.earnings = earnings;

    const { error } = await supabase.from('articles').update(updates).eq('id', id);

    if (error) throw error;
  }

  async incrementArticleViews(articleId: number): Promise<boolean> {
    // Use PostgreSQL increment: views = views + 1
    const { error } = await supabase.rpc('increment_article_views', {
      article_id: articleId,
    });

    if (error) {
      // If function doesn't exist, fall back to manual increment
      const article = await this.getArticleById(articleId);
      if (!article) return false;

      const { error: updateError } = await supabase
        .from('articles')
        .update({ views: article.views + 1 })
        .eq('id', articleId);

      if (updateError) throw updateError;
    }

    return true;
  }

  async updatePopularityScore(articleId: number): Promise<void> {
    // Get article metrics
    const article = await this.getArticleById(articleId);
    if (!article) throw new Error(`Article ${articleId} not found`);

    // Calculate new score
    const score = calculatePopularityScore(
      article.views,
      article.likes,
      article.purchases,
      article.publishDate
    );

    // Update database
    const { error } = await supabase
      .from('articles')
      .update({ popularity_score: score })
      .eq('id', articleId);

    if (error) throw error;
  }

  async recalculateAllPopularityScores(): Promise<{ updated: number; errors: number }> {
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, views, likes, purchases, publish_date');

    if (error) throw error;

    let updated = 0;
    let errors = 0;

    console.log(`🔄 Recalculating popularity scores for ${articles.length} articles...`);

    for (const article of articles) {
      try {
        const score = calculatePopularityScore(
          article.views,
          article.likes,
          article.purchases,
          article.publish_date
        );

        const { error: updateError } = await supabase
          .from('articles')
          .update({ popularity_score: score })
          .eq('id', article.id);

        if (updateError) throw updateError;
        updated++;
      } catch (error) {
        console.error(`❌ Error updating article ${article.id}:`, error);
        errors++;
      }
    }

    console.log(`✅ Recalculation complete: ${updated} updated, ${errors} errors`);
    return { updated, errors };
  }

  // ============================================
  // AUTHOR METHODS
  // ============================================

  async createOrUpdateAuthor(author: Author): Promise<Author> {
    const normalizedAddress = normalizeFlexibleAddress(author.address);

    const { data, error } = await supabase
      .from('authors')
      .upsert({
        address: normalizedAddress,
        author_uuid: author.authorUuid || undefined,
        created_at: author.createdAt,
        total_earnings: author.totalEarnings,
        total_articles: author.totalArticles,
        total_views: author.totalViews,
        total_purchases: author.totalPurchases,
      })
      .select()
      .single();

    if (error) throw error;
    return this.hydrateAuthorRow(data);
  }

  async getAuthor(address: string): Promise<Author | null> {
    return this.getAuthorByAddress(normalizeFlexibleAddress(address));
  }

  async getAuthorByAddress(address: string): Promise<Author | null> {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .eq('address', address)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.hydrateAuthorRow(data);
  }

  async getAuthorByUuid(authorUuid: string): Promise<Author | null> {
    const { data, error } = await supabase
      .from('authors')
      .select('*')
      .eq('author_uuid', authorUuid)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return this.hydrateAuthorRow(data);
  }

  async getAuthorByWallet(address: string): Promise<Author | null> {
    const authorUuid = await this.findAuthorUuidByWallet(address);
    if (!authorUuid) {
      return null;
    }
    const author = await this.getAuthorByUuid(authorUuid);
    return author;
  }

  async recalculateAuthorTotals(authorAddress: string): Promise<void> {
    const normalizedAddress = normalizeFlexibleAddress(authorAddress);

    // Use PostgreSQL function
    const { error } = await supabase.rpc('recalculate_author_totals', {
      target_author_address: normalizedAddress,
    });

    if (error) {
      // If function doesn't exist, fall back to manual calculation
      const client = await pgPool.connect();
      try {
        const result = await client.query(
          `SELECT
            COUNT(*) as article_count,
            COALESCE(SUM(views), 0) as total_views,
            COALESCE(SUM(purchases), 0) as total_purchases,
            COALESCE(SUM(earnings), 0) as total_earnings
           FROM articles WHERE author_address = $1`,
          [normalizedAddress]
        );

        const row = result.rows[0];
        const author = await this.getAuthor(normalizedAddress);

        if (author) {
          author.totalViews = Math.max(parseInt(row.total_views), 0);
          author.totalPurchases = Math.max(parseInt(row.total_purchases), 0);
          author.totalEarnings = Math.max(parseFloat(row.total_earnings), 0);
          author.totalArticles = Math.max(author.totalArticles, parseInt(row.article_count));

          await this.createOrUpdateAuthor(author);
        }
      } finally {
        client.release();
      }
    }
  }

  async setAuthorWallet(options: {
    authorUuid: string;
    address: string;
    network: SupportedAuthorNetwork;
    isPrimary: boolean;
  }): Promise<void> {
    const normalizedAddress = normalizeFlexibleAddress(options.address);

    const deleteQuery = supabase
      .from('author_wallets')
      .delete()
      .eq('author_uuid', options.authorUuid);

    if (options.isPrimary) {
      deleteQuery.eq('is_primary', true);
    } else {
      deleteQuery.eq('network', options.network);
    }

    const { error: deleteError } = await deleteQuery;
    if (deleteError && deleteError.code && deleteError.code !== 'PGRST116') {
      throw deleteError;
    }

    const { error } = await supabase
      .from('author_wallets')
      .insert({
        author_uuid: options.authorUuid,
        address: normalizedAddress,
        network: options.network,
        is_primary: options.isPrimary,
      });

    if (error) throw error;
  }

  async removeAuthorWallet(options: {
    authorUuid: string;
    network: SupportedAuthorNetwork;
  }): Promise<void> {
    const { error } = await supabase
      .from('author_wallets')
      .delete()
      .eq('author_uuid', options.authorUuid)
      .eq('network', options.network)
      .eq('is_primary', false);

    if (error && error.code !== 'PGRST116') {
      throw error;
    }
  }

  // ============================================
  // DRAFT METHODS
  // ============================================

  async createDraft(draft: Omit<Draft, 'id'>): Promise<Draft> {
    const normalizedAuthorAddress = normalizeFlexibleAddress(draft.authorAddress);

    const { data, error } = await supabase
      .from('drafts')
      .insert({
        title: draft.title,
        content: draft.content,
        price: draft.price,
        author_address: normalizedAuthorAddress,
        created_at: draft.createdAt,
        updated_at: draft.updatedAt,
        expires_at: draft.expiresAt,
        is_auto_save: draft.isAutoSave,
      })
      .select()
      .single();

    if (error) throw error;
    return this.parseDraftFromRow(data);
  }

  async updateDraft(draftId: number, draft: Omit<Draft, 'id'>): Promise<Draft> {
    const normalizedAuthorAddress = normalizeFlexibleAddress(draft.authorAddress);

    const { data, error } = await supabase
      .from('drafts')
      .update({
        title: draft.title,
        content: draft.content,
        price: draft.price,
        updated_at: draft.updatedAt,
        expires_at: draft.expiresAt,
        is_auto_save: draft.isAutoSave,
      })
      .eq('id', draftId)
      .eq('author_address', normalizedAuthorAddress)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('Draft not found or unauthorized');
      throw error;
    }

    return this.parseDraftFromRow(data);
  }

  async createOrUpdateRecentDraft(draft: Omit<Draft, 'id'>, isAutoSave: boolean = false): Promise<Draft> {
    const draftWithFlag: Omit<Draft, 'id'> = {
      ...draft,
      isAutoSave,
    };

    if (!isAutoSave) {
      // Manual save: always create new draft
      return this.createDraft(draftWithFlag);
    }

    // Auto-save: check for recent draft (within 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const normalizedAuthorAddress = normalizeFlexibleAddress(draft.authorAddress);

    const { data: recentDraft, error: fetchError } = await supabase
      .from('drafts')
      .select('id')
      .eq('author_address', normalizedAuthorAddress)
      .eq('is_auto_save', true)
      .gt('updated_at', oneHourAgo)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (recentDraft) {
      // Update recent draft
      return this.updateDraft(recentDraft.id, draftWithFlag);
    } else {
      // Create new draft
      return this.createDraft(draftWithFlag);
    }
  }

  async getDraftsByAuthor(authorAddress: string): Promise<Draft[]> {
    const normalizedAddress = normalizeFlexibleAddress(authorAddress);

    const { data, error } = await supabase
      .from('drafts')
      .select('*')
      .eq('author_address', normalizedAddress)
      .gt('expires_at', new Date().toISOString())
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return data.map(row => this.parseDraftFromRow(row));
  }

  async deleteDraft(draftId: number, authorAddress: string): Promise<boolean> {
    const normalizedAddress = normalizeFlexibleAddress(authorAddress);

    const { error } = await supabase
      .from('drafts')
      .delete()
      .eq('id', draftId)
      .eq('author_address', normalizedAddress);

    if (error) throw error;
    return true;
  }

  async cleanupExpiredDrafts(): Promise<number> {
    const { data, error } = await supabase
      .from('drafts')
      .delete()
      .lte('expires_at', new Date().toISOString())
      .select();

    if (error) throw error;
    return data?.length || 0;
  }

  // ============================================
  // LIKE METHODS
  // ============================================

  async likeArticle(articleId: number, userAddress: string): Promise<boolean> {
    const now = new Date().toISOString();
    const normalizedUserAddress = normalizeFlexibleAddress(userAddress);

    const { error } = await supabase.from('user_likes').insert({
      article_id: articleId,
      user_address: normalizedUserAddress,
      created_at: now,
    });

    if (error) {
      // Check if it's a duplicate like (UNIQUE constraint violation)
      if (error.code === '23505') {
        // User already liked this article
        return false;
      }
      throw error;
    }

    // Successfully added like
    return true;
  }

  async unlikeArticle(articleId: number, userAddress: string): Promise<boolean> {
    const normalizedUserAddress = normalizeFlexibleAddress(userAddress);

    const { error } = await supabase
      .from('user_likes')
      .delete()
      .eq('article_id', articleId)
      .eq('user_address', normalizedUserAddress);

    if (error) throw error;
    return true;
  }

  async checkUserLikedArticle(articleId: number, userAddress: string): Promise<boolean> {
    const normalizedUserAddress = normalizeFlexibleAddress(userAddress);

    const { data, error } = await supabase
      .from('user_likes')
      .select('id')
      .eq('article_id', articleId)
      .eq('user_address', normalizedUserAddress)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  }

  async updateArticleLikesCount(articleId: number): Promise<void> {
    // Use PostgreSQL function
    const { error } = await supabase.rpc('recalculate_article_likes', {
      target_article_id: articleId,
    });

    if (error) {
      // If function doesn't exist, fall back to manual count
      const { count, error: countError } = await supabase
        .from('user_likes')
        .select('*', { count: 'exact', head: true })
        .eq('article_id', articleId);

      if (countError) throw countError;

      const { error: updateError } = await supabase
        .from('articles')
        .update({ likes: count || 0 })
        .eq('id', articleId);

      if (updateError) throw updateError;
    }
  }

  // ============================================
  // PAYMENT TRACKING METHODS
  // ============================================

  async recordPayment(
    articleId: number,
    userAddress: string,
    amount: number,
    transactionHash?: string
  ): Promise<boolean> {
    const normalizedUserAddress =
      tryNormalizeFlexibleAddress(userAddress) ?? userAddress;

    const { error } = await supabase.from('payments').insert({
      article_id: articleId,
      user_address: normalizedUserAddress,
      amount,
      transaction_hash: transactionHash,
      payment_verified: true,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Ignore duplicate payment errors (UNIQUE constraint)
      if (error.code === '23505') {
        console.log(`Payment already recorded for article ${articleId} by ${normalizedUserAddress}`);
        return false;
      }
      throw error;
    }

    return true;
  }

  /**
   * Verify if user paid for resource already to determine if paywall is displayed 
   * Uses findAuthorUuidByWallet() to determineif either of user's wallets has alread purchased the resource
   * Gracefully handle scenario when authorUuid does nto exist.
   */
  async checkPaymentStatus(articleId: number, userAddress: string): Promise<boolean> {
    const normalizedUserAddress = normalizeFlexibleAddress(userAddress);

    const authorUuid = await this.findAuthorUuidByWallet(normalizedUserAddress);

    if (!authorUuid) {
      // Should not happen in normal flow, but handle gracefully
      // Check direct address as safety fallback
      const { data, error } = await supabase
        .from('payments')
        .select('id')
        .eq('article_id', articleId)  // ✅ Fixed: was 'articleId' (string literal)
        .eq('user_address', normalizedUserAddress)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;

    }

    // Get all wallets addresses for this author (user)
    const { data: wallets, error: walletsError } = await supabase
      .from('author_wallets')
      .select('address')
      .eq('author_uuid', authorUuid)

    if (walletsError) {
      throw walletsError;
    }

    if (!wallets || wallets.length === 0) {
      // No wallets found - should not happen but still handle
      return false;
    }

    const walletAddresses = wallets.map(w => w.address);

    // Check if ANY of author's wallets has paid for resource
    const { data, error } = await supabase
      .from('payments')
      .select('id')
      .eq('article_id', articleId)
      .in('user_address', walletAddresses)  // ✅ Fixed: was .eq() instead of .in()
      .limit(1);

    if (error) {
      throw error;
    }

    return data && data.length > 0;
  }

  async getPaymentsByArticle(articleId: number): Promise<number> {
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('article_id', articleId);

    if (error) throw error;
    return count || 0;
  }

  async getPaymentsByUser(userAddress: string): Promise<number> {
    const normalizedUserAddress = normalizeFlexibleAddress(userAddress);

    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_address', normalizedUserAddress);

    if (error) throw error;
    return count || 0;
  }

  // ============================================
  // CLEANUP
  // ============================================

  close(): void {
    // Supabase client doesn't need explicit closing
    // pgPool is managed globally
    console.log('✅ Database connection closed');
  }
}

export default Database;
