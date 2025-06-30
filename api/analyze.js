const ReviewAnalyzer = require('../src/ReviewAnalyzer');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { reviews, propertyName } = req.body;

    // Validation
    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        error: 'Reviews array is required and must not be empty'
      });
    }

    if (reviews.length > 50) {
      return res.status(400).json({
        error: 'Maximum 50 reviews allowed per request'
      });
    }

    // Initialize analyzer
    const reviewAnalyzer = new ReviewAnalyzer();
    
    // Use ReviewAnalyzer to analyze reviews
    const result = reviewAnalyzer.analyzeReviews(reviews, 5, propertyName);
    res.status(200).json(result);

  } catch (error) {
    console.error('Error processing analysis request:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
