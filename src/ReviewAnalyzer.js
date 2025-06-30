class ReviewAnalyzer {
  constructor(options = {}) {
    this.defaultMaxReviews = options.maxReviews || 5;
    this.positiveKeywords = options.positiveKeywords || [
      'amazing', 'excellent', 'perfect', 'wonderful', 'fantastic', 'great', 'love', 'loved',
      'beautiful', 'clean', 'comfortable', 'recommend', 'highly recommend', 'best',
      'awesome', 'incredible', 'outstanding', 'superb', 'brilliant', 'lovely',
      'enjoyed', 'perfect', 'spotless', 'helpful', 'friendly', 'welcoming'
    ];
    this.detailKeywords = options.detailKeywords || [
      'hot tub', 'location', 'host', 'cabin', 'view', 'kitchen', 'bathroom',
      'bed', 'shower', 'wifi', 'parking', 'garden', 'breakfast', 'restaurant'
    ];
  }

  /**
   * Score a single review based on various criteria
   * @param {string} review - Review text to score
   * @returns {number} - Review score
   */
  scoreReview(review) {
    let score = 0;
    
    // Length score (prefer reviews between 100-800 characters)
    const length = review.length;
    if (length >= 100 && length <= 800) {
      score += 10;
    } else if (length >= 50 && length <= 1000) {
      score += 5;
    }
    
    // Positive keywords score
    const lowerReview = review.toLowerCase();
    this.positiveKeywords.forEach(keyword => {
      if (lowerReview.includes(keyword)) {
        score += 2;
      }
    });
    
    // Specific details score (mentions specific amenities or experiences)
    this.detailKeywords.forEach(keyword => {
      if (lowerReview.includes(keyword)) {
        score += 1;
      }
    });
    
    return score;
  }

  /**
   * Select top reviews based on scoring algorithm
   * @param {Array} reviews - Array of review texts
   * @param {number} maxReviews - Maximum number of reviews to return
   * @returns {Array} - Top scored reviews
   */
  selectTopReviews(reviews, maxReviews = this.defaultMaxReviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return [];
    }

    // Score reviews based on length, positive keywords, and content quality
    const scoredReviews = reviews.map(review => ({
      review,
      score: this.scoreReview(review)
    }));
    
    // Sort by score (highest first) and return top reviews
    return scoredReviews
      .sort((a, b) => b.score - a.score)
      .slice(0, maxReviews)
      .map(item => item.review);
  }

  /**
   * Analyze reviews and return detailed results
   * @param {Array} reviews - Array of review texts
   * @param {number} maxReviews - Maximum number of top reviews to return
   * @param {string} propertyName - Optional property name
   * @returns {Object} - Analysis results
   */
  analyzeReviews(reviews, maxReviews = this.defaultMaxReviews, propertyName = 'Unknown Property') {
    if (!Array.isArray(reviews)) {
      throw new Error('Reviews must be an array');
    }

    if (reviews.length === 0) {
      return {
        propertyName,
        totalReviews: 0,
        topReviews: [],
        analyzedAt: new Date().toISOString()
      };
    }

    // Validate reviews are strings
    const invalidReviews = reviews.filter(review => typeof review !== 'string' || review.trim().length === 0);
    if (invalidReviews.length > 0) {
      throw new Error('All reviews must be non-empty strings');
    }

    const topReviews = this.selectTopReviews(reviews, maxReviews);

    return {
      propertyName,
      totalReviews: reviews.length,
      topReviews,
      analyzedAt: new Date().toISOString()
    };
  }

  /**
   * Get detailed scoring breakdown for a review (useful for debugging)
   * @param {string} review - Review text to analyze
   * @returns {Object} - Detailed scoring breakdown
   */
  getReviewScoreBreakdown(review) {
    const length = review.length;
    const lowerReview = review.toLowerCase();
    
    let lengthScore = 0;
    if (length >= 100 && length <= 800) {
      lengthScore = 10;
    } else if (length >= 50 && length <= 1000) {
      lengthScore = 5;
    }

    const foundPositiveKeywords = this.positiveKeywords.filter(keyword => 
      lowerReview.includes(keyword)
    );
    const positiveScore = foundPositiveKeywords.length * 2;

    const foundDetailKeywords = this.detailKeywords.filter(keyword => 
      lowerReview.includes(keyword)
    );
    const detailScore = foundDetailKeywords.length;

    const totalScore = lengthScore + positiveScore + detailScore;

    return {
      review: review.substring(0, 100) + (review.length > 100 ? '...' : ''),
      length,
      lengthScore,
      foundPositiveKeywords,
      positiveScore,
      foundDetailKeywords,
      detailScore,
      totalScore
    };
  }

  /**
   * Analyze and rank all reviews with scores (useful for debugging)
   * @param {Array} reviews - Array of review texts
   * @returns {Array} - Reviews with scores, sorted by score
   */
  rankAllReviews(reviews) {
    if (!Array.isArray(reviews)) {
      throw new Error('Reviews must be an array');
    }

    return reviews
      .map(review => ({
        review,
        score: this.scoreReview(review),
        breakdown: this.getReviewScoreBreakdown(review)
      }))
      .sort((a, b) => b.score - a.score);
  }
}

module.exports = ReviewAnalyzer;
