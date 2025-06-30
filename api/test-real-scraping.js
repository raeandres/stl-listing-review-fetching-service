const VercelAirbnbScraper = require('../src/VercelAirbnbScraper');
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

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // Use a known Airbnb listing for testing
    const testListingId = '20669368'; // The one we tested locally
    const testUrl = `https://www.airbnb.com/rooms/${testListingId}`;
    
    const scraper = new VercelAirbnbScraper();
    const analyzer = new ReviewAnalyzer();
    
    // Capture all logs for debugging
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      logs.push({ type: 'log', message: args.join(' '), timestamp: new Date().toISOString() });
      originalLog(...args);
    };
    
    console.error = (...args) => {
      logs.push({ type: 'error', message: args.join(' '), timestamp: new Date().toISOString() });
      originalError(...args);
    };

    let result = {
      testUrl,
      listingId: testListingId,
      timestamp: new Date().toISOString(),
      steps: []
    };

    try {
      // Step 1: Test basic connectivity
      result.steps.push('Testing basic connectivity...');
      const client = scraper.getHttpClient();
      const response = await client.get(testUrl);
      result.steps.push(`✅ Connected successfully (${response.status})`);
      result.responseSize = response.data.length;
      result.hasReviewsSection = response.data.includes('REVIEWS_DEFAULT');
      
      // Step 2: Try to scrape reviews
      result.steps.push('Attempting to scrape reviews...');
      const scrapingResult = await scraper.scrapeComplete(testUrl, 5);
      result.steps.push(`✅ Scraping completed`);
      result.scrapingResult = scrapingResult;
      
      // Step 3: Analyze reviews if found
      if (scrapingResult.reviews.length > 0) {
        result.steps.push('Analyzing reviews...');
        const topReviews = analyzer.selectTopReviews(scrapingResult.reviews, 3);
        result.steps.push(`✅ Analysis completed`);
        result.topReviews = topReviews;
        result.success = true;
      } else {
        result.steps.push('⚠️ No reviews found, using mock data');
        const mockReviews = await scraper.getMockReviews(testListingId);
        const topReviews = analyzer.selectTopReviews(mockReviews, 3);
        result.mockReviews = mockReviews;
        result.topReviews = topReviews;
        result.success = false;
        result.reason = 'No real reviews found';
      }
      
    } catch (error) {
      result.steps.push(`❌ Error: ${error.message}`);
      result.success = false;
      result.error = error.message;
      
      // Fallback to mock data
      const mockReviews = await scraper.getMockReviews(testListingId);
      const topReviews = analyzer.selectTopReviews(mockReviews, 3);
      result.mockReviews = mockReviews;
      result.topReviews = topReviews;
    }

    // Restore console
    console.log = originalLog;
    console.error = originalError;
    
    result.logs = logs;
    
    res.status(200).json(result);

  } catch (error) {
    res.status(500).json({
      error: error.message,
      message: 'Test endpoint failed'
    });
  }
};
