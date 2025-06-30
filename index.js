const express = require('express');
const cors = require('cors');
const AirbnbScraper = require('./src/AirbnbScraper');
const ReviewAnalyzer = require('./src/ReviewAnalyzer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const airbnbScraper = new AirbnbScraper();
const reviewAnalyzer = new ReviewAnalyzer();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());











// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Analyze reviews and get top 5 (without external AI)
app.post('/api/analyze', async (req, res) => {
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

    // Use ReviewAnalyzer to analyze reviews
    const result = reviewAnalyzer.analyzeReviews(reviews, 5, propertyName);
    res.json(result);

  } catch (error) {
    console.error('Error processing analysis request:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});



// Scrape Airbnb reviews and get top 5 positive reviews
app.post('/api/scrape-and-analyze', async (req, res) => {
  try {
    const { airbnbUrl, maxReviews = 20 } = req.body;

    // Validation
    if (!airbnbUrl || typeof airbnbUrl !== 'string') {
      return res.status(400).json({
        error: 'Valid Airbnb URL is required'
      });
    }

    if (!airbnbUrl.includes('airbnb.com')) {
      return res.status(400).json({
        error: 'Please provide a valid Airbnb URL'
      });
    }

    // Use AirbnbScraper to get complete data
    const scrapingResult = await airbnbScraper.scrapeComplete(airbnbUrl, maxReviews);

    if (scrapingResult.reviews.length === 0) {
      return res.status(404).json({
        error: 'No reviews found for this listing'
      });
    }

    // Use ReviewAnalyzer to select top 5 reviews
    const topReviews = reviewAnalyzer.selectTopReviews(scrapingResult.reviews, 5);

    res.json({
      listingId: scrapingResult.listingId,
      propertyName: scrapingResult.propertyName,
      location: scrapingResult.location,
      allReviews: scrapingResult.reviews,
      topReviews: topReviews,
      totalReviews: scrapingResult.reviewCount,
      topReviewsCount: topReviews.length,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing scrape and analyze request:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Scrape reviews only (without analysis)
app.post('/api/scrape-reviews', async (req, res) => {
  try {
    const { airbnbUrl, maxReviews = 20 } = req.body;

    // Validation
    if (!airbnbUrl || typeof airbnbUrl !== 'string') {
      return res.status(400).json({
        error: 'Valid Airbnb URL is required'
      });
    }

    if (!airbnbUrl.includes('airbnb.com')) {
      return res.status(400).json({
        error: 'Please provide a valid Airbnb URL'
      });
    }

    // Use AirbnbScraper to get complete data
    const result = await airbnbScraper.scrapeComplete(airbnbUrl, maxReviews);

    if (result.reviews.length === 0) {
      return res.status(404).json({
        error: 'No reviews found for this listing'
      });
    }

    res.json(result);

  } catch (error) {
    console.error('Error scraping reviews:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Airbnb Reviews Scraper running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📝 API Documentation:`);
  console.log(`   POST /api/analyze - Analyze reviews to get top 5 reviews`);
  console.log(`   POST /api/scrape-and-analyze - Scrape Airbnb reviews and get top 5 positive reviews`);
  console.log(`   POST /api/scrape-reviews - Scrape Airbnb reviews only (without analysis)`);

  // Display environment info for debugging
  console.log(`\n🔍 Environment Info:`);
  console.log(`   Platform: ${process.platform}`);
  console.log(`   Node.js: ${process.version}`);
  console.log(`   Chrome Path: ${process.env.PUPPETEER_EXECUTABLE_PATH || 'Auto-detect'}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;