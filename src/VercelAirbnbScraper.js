const axios = require('axios');
const cheerio = require('cheerio');

class VercelAirbnbScraper {
  constructor(options = {}) {
    this.timeout = options.timeout || 15000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.maxRetries = options.maxRetries || 2;
  }

  /**
   * Extract listing ID from Airbnb URL
   */
  extractListingId(url) {
    const match = url.match(/\/rooms\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Airbnb URL. Please provide a valid Airbnb listing URL.');
    }
    return match[1];
  }

  /**
   * Get HTTP client with proper headers
   */
  getHttpClient() {
    return axios.create({
      timeout: this.timeout,
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    });
  }

  /**
   * Scrape listing information using HTTP requests
   */
  async scrapeListingInfo(listingId) {
    const client = this.getHttpClient();
    
    try {
      const listingUrl = `https://www.airbnb.com/rooms/${listingId}`;
      const response = await client.get(listingUrl);
      const $ = cheerio.load(response.data);
      
      // Extract title
      let title = 'Unknown Property';
      const titleSelectors = [
        'h1',
        '[data-section-id="HERO_DEFAULT"] h1',
        '.title h1',
        '.listing-title',
        'title'
      ];
      
      for (const selector of titleSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          title = element.text().trim();
          // Clean up title if it's from the page title
          if (selector === 'title') {
            title = title.split(' - ')[0] || title;
          }
          break;
        }
      }
      
      // Extract location
      let location = 'Unknown Location';
      const locationSelectors = [
        '[data-section-id="LOCATION_DEFAULT"] button',
        '.location button',
        '[data-testid="location"]',
        '.address'
      ];
      
      for (const selector of locationSelectors) {
        const element = $(selector).first();
        if (element.length && element.text().trim()) {
          location = element.text().trim();
          break;
        }
      }
      
      return { title, location };
      
    } catch (error) {
      throw new Error(`Error scraping listing info: ${error.message}`);
    }
  }

  /**
   * Scrape reviews using HTTP requests and HTML parsing
   */
  async scrapeReviews(listingId, maxReviews = 20) {
    const client = this.getHttpClient();
    
    try {
      const reviewsUrl = `https://www.airbnb.com/rooms/${listingId}/reviews`;
      const response = await client.get(reviewsUrl);
      const $ = cheerio.load(response.data);
      
      const reviews = [];
      const seenReviews = new Set();
      
      // Try different selectors for reviews
      const reviewSelectors = [
        '[data-section-id="REVIEWS_DEFAULT"] span',
        '[data-section-id="REVIEWS_DEFAULT"] p',
        '[data-section-id="REVIEWS_DEFAULT"] div',
        '.reviews span',
        '.reviews p',
        '.review-text',
        '[data-testid="review-text"]'
      ];
      
      for (const selector of reviewSelectors) {
        $(selector).each((index, element) => {
          const text = $(element).text().trim();
          
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
              
              if (reviews.length >= maxReviews) {
                return false; // Break out of each loop
              }
            }
          }
        });
        
        if (reviews.length >= maxReviews) {
          break;
        }
      }
      
      return reviews.slice(0, maxReviews);
      
    } catch (error) {
      throw new Error(`Error scraping reviews: ${error.message}`);
    }
  }

  /**
   * Complete scraping workflow
   */
  async scrapeComplete(airbnbUrl, maxReviews = 20) {
    try {
      const listingId = this.extractListingId(airbnbUrl);
      
      // Get listing info and reviews
      const [listingInfo, reviews] = await Promise.all([
        this.scrapeListingInfo(listingId),
        this.scrapeReviews(listingId, maxReviews)
      ]);
      
      return {
        listingId,
        propertyName: listingInfo.title,
        location: listingInfo.location,
        reviews,
        reviewCount: reviews.length,
        scrapedAt: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Error in complete scraping: ${error.message}`);
    }
  }

  /**
   * Fallback method using mock data for demo purposes
   */
  async getMockReviews(listingId) {
    return [
      "Amazing place with stunning views! The host was incredibly welcoming and the location was perfect for exploring the area. Would definitely stay again!",
      "Beautiful property in a great location. Everything was clean and well-maintained. The host provided excellent recommendations for local restaurants.",
      "Perfect getaway spot! The amenities were exactly as described and the check-in process was seamless. Highly recommend this place.",
      "Lovely stay with wonderful hosts. The property exceeded our expectations and the surrounding area was peaceful and scenic.",
      "Great experience overall! The place was spotless, comfortable, and had everything we needed for our vacation."
    ];
  }
}

module.exports = VercelAirbnbScraper;
