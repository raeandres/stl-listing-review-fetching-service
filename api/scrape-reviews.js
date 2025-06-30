const VercelAirbnbScraper = require('../src/VercelAirbnbScraper');

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

    // Initialize scraper
    const scraper = new VercelAirbnbScraper();
    
    // Use VercelAirbnbScraper to get data
    const result = await scraper.scrapeComplete(airbnbUrl, maxReviews);
    
    if (result.reviews.length === 0) {
      // Fallback to mock data for demo
      const listingId = scraper.extractListingId(airbnbUrl);
      const mockReviews = await scraper.getMockReviews(listingId);
      
      return res.status(200).json({
        listingId,
        propertyName: 'Demo Property (Mock Data)',
        location: 'Demo Location',
        reviews: mockReviews,
        reviewCount: mockReviews.length,
        scrapedAt: new Date().toISOString(),
        note: 'This is mock data for demonstration. Real scraping may be limited on serverless platforms.'
      });
    }

    res.status(200).json(result);

  } catch (error) {
    console.error('Error scraping reviews:', error);
    
    // Fallback to mock data on error
    try {
      const scraper = new VercelAirbnbScraper();
      const mockReviews = await scraper.getMockReviews('demo');
      
      res.status(200).json({
        listingId: 'demo',
        propertyName: 'Demo Property (Fallback)',
        location: 'Demo Location',
        reviews: mockReviews,
        reviewCount: mockReviews.length,
        scrapedAt: new Date().toISOString(),
        note: 'Fallback mock data due to scraping limitations on serverless platforms.',
        originalError: error.message
      });
    } catch (fallbackError) {
      res.status(500).json({
        error: error.message || 'Internal server error'
      });
    }
  }
};
