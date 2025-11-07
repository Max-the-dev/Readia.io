Article Popularity & Ranking System


1. Feature Overview

What Problem Does This Solve?

Discovery Problem: Users currently see articles in chronological order only, making it hard to find quality content
Content Visibility: Good articles with high engagement (likes, views, purchases) get buried over time
User Engagement: No intelligent sorting makes exploration less engaging

Who Is It For?

Readers: Find popular, trending, and high-quality content easily
Writers: Get better visibility for high-performing articles
Platform: Improve content discovery and user engagement metrics

Key Functionality

Popularity Score: Weighted algorithm combining views, likes, and purchases
Time Decay: Recent articles get visibility boost to ensure fresh content
Multiple Sort Options: Latest, Most Popular, Most Viewed, Most Liked
Category-Based Ranking: Default to popularity when browsing categories
Automatic Recalculation: Scores update on metric changes + daily batch job


2. Technical Design

Architecture
User Interaction (view/like/purchase)
          ↓
    Backend API
          ↓
Update Article Metrics
          ↓
Recalculate Popularity Score
          ↓
    Database (articles.popularityScore)
          ↓
Frontend Explore Page (sorted by popularityScore)


Popularity Score Algorithm
// Weighted scoring formula
popularityScore = (
  (views × VIEWS_WEIGHT) +
  (likes × LIKES_WEIGHT) +
  (purchases × PURCHASES_WEIGHT)
) × timeDecayFactor

// Time decay formula (exponential decay)
const ageInDays = (now - publishDate) / (1000 * 60 * 60 * 24);
const HALF_LIFE_DAYS = 7; // Article loses 50% boost after 7 days
timeDecayFactor = Math.pow(2, -ageInDays / HALF_LIFE_DAYS);

// Weights
VIEWS_WEIGHT = 1
LIKES_WEIGHT = 10      // Likes worth 10x views
PURCHASES_WEIGHT = 50  // Purchases worth 50x views