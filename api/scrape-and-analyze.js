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

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

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

    // Initialize services
    const scraper = new VercelAirbnbScraper();
    const analyzer = new ReviewAnalyzer();
    
    let scrapingResult;
    
    try {
      // Use VercelAirbnbScraper to get complete data
      scrapingResult = await scraper.scrapeComplete(airbnbUrl, maxReviews);
    } catch (scrapingError) {
      // Fallback to mock data
      const listingId = scraper.extractListingId(airbnbUrl);
      const mockReviews = await scraper.getMockReviews(listingId);
      
      scrapingResult = {
        listingId,
        propertyName: 'Demo Property (Mock Data)',
        location: 'Demo Location',
        reviews: mockReviews,
        reviewCount: mockReviews.length,
        scrapedAt: new Date().toISOString()
      };
    }
    
    if (scrapingResult.reviews.length === 0) {
      return res.status(404).json({
        error: 'No reviews found for this listing'
      });
    }

    // Use ReviewAnalyzer to select top 5 reviews
    const topReviews = analyzer.selectTopReviews(scrapingResult.reviews, 5);

    const result = {
      listingId: scrapingResult.listingId,
      propertyName: scrapingResult.propertyName,
      location: scrapingResult.location,
      allReviews: scrapingResult.reviews,
      topReviews: topReviews,
      totalReviews: scrapingResult.reviewCount,
      topReviewsCount: topReviews.length,
      analyzedAt: new Date().toISOString()
    };

    // Add note if using mock data
    if (scrapingResult.propertyName.includes('Mock Data')) {
      result.note = 'This includes mock data for demonstration. Real scraping may be limited on serverless platforms.';
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Error processing scrape and analyze request:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
};
