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
    const { airbnbUrl } = req.body;

    if (!airbnbUrl || !airbnbUrl.includes('airbnb.com')) {
      return res.status(400).json({
        error: 'Valid Airbnb URL is required'
      });
    }

    const scraper = new VercelAirbnbScraper();
    const listingId = scraper.extractListingId(airbnbUrl);
    
    // Capture console logs
    const logs = [];
    const originalLog = console.log;
    const originalError = console.error;
    
    console.log = (...args) => {
      logs.push({ type: 'log', message: args.join(' ') });
      originalLog(...args);
    };
    
    console.error = (...args) => {
      logs.push({ type: 'error', message: args.join(' ') });
      originalError(...args);
    };

    try {
      // Test basic HTTP request
      const client = scraper.getHttpClient();
      const testUrl = `https://www.airbnb.com/rooms/${listingId}`;
      
      const response = await client.get(testUrl);
      
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      res.status(200).json({
        listingId,
        testUrl,
        responseStatus: response.status,
        responseSize: response.data.length,
        contentType: response.headers['content-type'],
        hasReviewsSection: response.data.includes('REVIEWS_DEFAULT'),
        hasReviewKeywords: response.data.includes('review'),
        logs: logs,
        sample: response.data.substring(0, 1000) + '...'
      });
      
    } catch (error) {
      // Restore console
      console.log = originalLog;
      console.error = originalError;
      
      res.status(200).json({
        listingId,
        error: error.message,
        logs: logs,
        debug: 'Failed to fetch page'
      });
    }

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
};
