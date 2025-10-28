import sqlite3 from 'sqlite3';
import path from 'path';
import { Article, Author } from './types';

class Database {
  private db: sqlite3.Database;

  constructor() {
    const dbPath = path.join(__dirname, '../penny.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  private initializeTables(): void {
    // Create authors table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS authors (
        address TEXT PRIMARY KEY,
        displayName TEXT,
        createdAt TEXT NOT NULL,
        totalEarnings REAL DEFAULT 0,
        totalArticles INTEGER DEFAULT 0,
        totalViews INTEGER DEFAULT 0,
        totalPurchases INTEGER DEFAULT 0
      )
    `);

    // Create articles table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        preview TEXT NOT NULL,
        price REAL NOT NULL,
        authorAddress TEXT NOT NULL,
        publishDate TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        views INTEGER DEFAULT 0,
        purchases INTEGER DEFAULT 0,
        earnings REAL DEFAULT 0,
        readTime TEXT NOT NULL,
        FOREIGN KEY (authorAddress) REFERENCES authors (address)
      )
    `);

    console.log('Database tables initialized');
  }

  // Article methods
  createArticle(article: Omit<Article, 'id'>): Promise<Article> {
    return new Promise((resolve, reject) => {
      const {
        title,
        content,
        preview,
        price,
        authorAddress,
        publishDate,
        createdAt,
        updatedAt,
        views,
        purchases,
        earnings,
        readTime
      } = article;

      this.db.run(
        `INSERT INTO articles (title, content, preview, price, authorAddress, publishDate, createdAt, updatedAt, views, purchases, earnings, readTime)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [title, content, preview, price, authorAddress, publishDate, createdAt, updatedAt, views, purchases, earnings, readTime],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, ...article } as Article);
          }
        }
      );
    });
  }

  getArticlesByAuthor(authorAddress: string): Promise<Article[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM articles WHERE authorAddress = ? ORDER BY createdAt DESC',
        [authorAddress],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Article[]);
          }
        }
      );
    });
  }

  getArticleById(id: number): Promise<Article | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM articles WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve((row as Article) || null);
          }
        }
      );
    });
  }

  getAllArticles(): Promise<Article[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM articles ORDER BY createdAt DESC',
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows as Article[]);
          }
        }
      );
    });
  }

  // Author methods
  createOrUpdateAuthor(author: Author): Promise<Author> {
    return new Promise((resolve, reject) => {
      const { address, displayName, createdAt, totalEarnings, totalArticles, totalViews, totalPurchases } = author;

      this.db.run(
        `INSERT OR REPLACE INTO authors (address, displayName, createdAt, totalEarnings, totalArticles, totalViews, totalPurchases)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [address, displayName, createdAt, totalEarnings, totalArticles, totalViews, totalPurchases],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(author);
          }
        }
      );
    });
  }

  getAuthor(address: string): Promise<Author | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM authors WHERE address = ?',
        [address],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve((row as Author) || null);
          }
        }
      );
    });
  }

  updateArticleStats(id: number, views?: number, purchases?: number, earnings?: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let query = 'UPDATE articles SET ';
      const params: any[] = [];
      const updates: string[] = [];

      if (views !== undefined) {
        updates.push('views = ?');
        params.push(views);
      }
      if (purchases !== undefined) {
        updates.push('purchases = ?');
        params.push(purchases);
      }
      if (earnings !== undefined) {
        updates.push('earnings = ?');
        params.push(earnings);
      }

      query += updates.join(', ') + ' WHERE id = ?';
      params.push(id);

      this.db.run(query, params, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  close(): void {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

export default Database;