const express = require('express');
const cors = require('cors');
const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  puppeteer = puppeteerCore;
}
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());



// Helper function to select top reviews based on length and keywords
function selectTopReviews(reviews, maxReviews = 5) {
  // Score reviews based on length, positive keywords, and content quality
  const scoredReviews = reviews.map(review => {
    let score = 0;

    // Length score (prefer reviews between 100-800 characters)
    const length = review.length;
    if (length >= 100 && length <= 800) {
      score += 10;
    } else if (length >= 50 && length <= 1000) {
      score += 5;
    }

    // Positive keywords score
    const positiveKeywords = [
      'amazing', 'excellent', 'perfect', 'wonderful', 'fantastic', 'great', 'love', 'loved',
      'beautiful', 'clean', 'comfortable', 'recommend', 'highly recommend', 'best',
      'awesome', 'incredible', 'outstanding', 'superb', 'brilliant', 'lovely',
      'enjoyed', 'perfect', 'spotless', 'helpful', 'friendly', 'welcoming'
    ];

    const lowerReview = review.toLowerCase();
    positiveKeywords.forEach(keyword => {
      if (lowerReview.includes(keyword)) {
        score += 2;
      }
    });

    // Specific details score (mentions specific amenities or experiences)
    const detailKeywords = [
      'hot tub', 'location', 'host', 'cabin', 'view', 'kitchen', 'bathroom',
      'bed', 'shower', 'wifi', 'parking', 'garden', 'breakfast', 'restaurant'
    ];

    detailKeywords.forEach(keyword => {
      if (lowerReview.includes(keyword)) {
        score += 1;
      }
    });

    return { review, score };
  });

  // Sort by score (highest first) and return top reviews
  return scoredReviews
    .sort((a, b) => b.score - a.score)
    .slice(0, maxReviews)
    .map(item => item.review);
}

// Web scraping functions for Airbnb
async function extractListingId(url) {
  try {
    // Extract listing ID from Airbnb URL
    const match = url.match(/\/rooms\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Airbnb URL. Please provide a valid Airbnb listing URL.');
    }
    return match[1];
  } catch (error) {
    throw new Error(`Error extracting listing ID: ${error.message}`);
  }
}

async function scrapeAirbnbReviews(listingId, maxReviews = 20) {
  let browser;
  try {
    // Launch browser with Chromium - handle different environments
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    };

    // Try different browser launch strategies
    try {
      // First try: Use bundled Chromium from puppeteer
      browser = await puppeteer.launch(launchOptions);
    } catch (error) {
      console.log('Bundled Chromium failed, trying @sparticuz/chromium...');
      try {
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = [...chromium.args, ...launchOptions.args];
        launchOptions.defaultViewport = chromium.defaultViewport;
        browser = await puppeteerCore.launch(launchOptions);
      } catch (error2) {
        console.log('Sparticuz Chromium failed, trying system Chrome...');
        // Use system Chrome as fallback - macOS path
        launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        browser = await puppeteerCore.launch(launchOptions);
      }
    }

    const page = await browser.newPage();
    
    // Set user agent to avoid detection
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to the reviews page
    const reviewsUrl = `https://www.airbnb.com/rooms/${listingId}/reviews`;
    await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for reviews to load
    try {
      await page.waitForSelector('[data-section-id="REVIEWS_DEFAULT"]', { timeout: 10000 });
    } catch (error) {
      console.log('Reviews section not found with default selector');
    }

    // Scroll to load reviews
    console.log('Scrolling to load reviews...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll again to ensure reviews are loaded
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Extract reviews using improved approach
    const reviews = await page.evaluate(() => {
      const reviewsSection = document.querySelector('[data-section-id="REVIEWS_DEFAULT"]');
      if (!reviewsSection) {
        return [];
      }

      // Look for actual review text using content patterns
      const elements = reviewsSection.querySelectorAll('span, p, div');
      const reviews = [];
      const seenReviews = new Set(); // Avoid duplicates

      elements.forEach(el => {
        const text = el.textContent.trim();
        // Look for text that looks like actual reviews
        if (text.length > 100 && text.length < 2000 &&
            (text.includes('stay') || text.includes('place') || text.includes('host') ||
             text.includes('recommend') || text.includes('beautiful') || text.includes('perfect') ||
             text.includes('amazing') || text.includes('lovely') || text.includes('great') ||
             text.includes('clean') || text.includes('comfortable') || text.includes('enjoyed'))) {
          // Make sure it's not metadata
          if (!text.includes('stars') && !text.includes('rating') &&
              !text.includes('reviews') && !text.includes('Show more') &&
              !seenReviews.has(text)) {
            reviews.push(text);
            seenReviews.add(text);
          }
        }
      });

      return reviews;
    });
    
    return reviews.slice(0, maxReviews);
    
  } catch (error) {
    throw new Error(`Error scraping Airbnb reviews: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function scrapeAirbnbListingInfo(listingId) {
  let browser;
  try {
    // Launch browser with Chromium - handle different environments
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ],
      headless: true,
      ignoreHTTPSErrors: true,
    };

    // Try different browser launch strategies
    try {
      // First try: Use bundled Chromium from puppeteer
      browser = await puppeteer.launch(launchOptions);
    } catch (error) {
      console.log('Bundled Chromium failed, trying @sparticuz/chromium...');
      try {
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = [...chromium.args, ...launchOptions.args];
        launchOptions.defaultViewport = chromium.defaultViewport;
        browser = await puppeteerCore.launch(launchOptions);
      } catch (error2) {
        console.log('Sparticuz Chromium failed, trying system Chrome...');
        // Use system Chrome as fallback - macOS path
        launchOptions.executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        browser = await puppeteerCore.launch(launchOptions);
      }
    }

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const listingUrl = `https://www.airbnb.com/rooms/${listingId}`;
    await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract listing information with multiple selector attempts
    const listingInfo = await page.evaluate(() => {
      // Try different selectors for title
      const titleSelectors = ['h1', '[data-section-id="HERO_DEFAULT"] h1', '.title h1', '.listing-title'];
      let title = 'Unknown Property';
      
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          title = element.textContent.trim();
          break;
        }
      }
      
      // Try different selectors for location
      const locationSelectors = [
        '[data-section-id="LOCATION_DEFAULT"] button',
        '.location button',
        '[data-testid="location"]',
        '.address'
      ];
      let location = 'Unknown Location';
      
      for (const selector of locationSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          location = element.textContent.trim();
          break;
        }
      }
      
      return { title, location };
    });
    
    return listingInfo;
    
  } catch (error) {
    throw new Error(`Error scraping listing info: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

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

    // Check if reviews are strings
    const invalidReviews = reviews.filter(review => typeof review !== 'string' || review.trim().length === 0);
    if (invalidReviews.length > 0) {
      return res.status(400).json({
        error: 'All reviews must be non-empty strings'
      });
    }

    // Select top 5 reviews using our algorithm
    const topReviews = selectTopReviews(reviews, 5);

    res.json({
      propertyName: propertyName || 'Unknown Property',
      totalReviews: reviews.length,
      topReviews: topReviews,
      analyzedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing analysis request:', error);
    res.status(500).json({
      error: 'Internal server error'
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

    // Extract listing ID
    const listingId = await extractListingId(airbnbUrl);

    // Get listing info
    const listingInfo = await scrapeAirbnbListingInfo(listingId);

    // Scrape reviews
    const scrapedReviews = await scrapeAirbnbReviews(listingId, maxReviews);

    if (scrapedReviews.length === 0) {
      return res.status(404).json({
        error: 'No reviews found for this listing'
      });
    }

    // Select top 5 reviews using our algorithm
    const topReviews = selectTopReviews(scrapedReviews, 5);

    res.json({
      listingId: listingId,
      propertyName: listingInfo.title,
      location: listingInfo.location,
      allReviews: scrapedReviews,
      topReviews: topReviews,
      totalReviews: scrapedReviews.length,
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

    // Extract listing ID
    const listingId = await extractListingId(airbnbUrl);
    
    // Get listing info
    const listingInfo = await scrapeAirbnbListingInfo(listingId);
    
    // Scrape reviews
    const reviews = await scrapeAirbnbReviews(listingId, maxReviews);
    
    if (reviews.length === 0) {
      return res.status(404).json({
        error: 'No reviews found for this listing'
      });
    }

    res.json({
      listingId: listingId,
      propertyName: listingInfo.title,
      location: listingInfo.location,
      reviews: reviews,
      reviewCount: reviews.length,
      scrapedAt: new Date().toISOString()
    });

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
});

module.exports = app;