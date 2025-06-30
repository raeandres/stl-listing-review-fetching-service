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
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        return status >= 200 && status < 400; // Accept redirects
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
      console.log(`Attempting to scrape: ${reviewsUrl}`);

      const response = await client.get(reviewsUrl);
      console.log(`Response status: ${response.status}, Content length: ${response.data.length}`);

      const $ = cheerio.load(response.data);

      // Debug: Check if we can find the reviews section
      const reviewsSection = $('[data-section-id="REVIEWS_DEFAULT"]');
      console.log(`Reviews section found: ${reviewsSection.length > 0}`);

      const reviews = [];
      const seenReviews = new Set();

      // More comprehensive selectors for reviews
      const reviewSelectors = [
        '[data-section-id="REVIEWS_DEFAULT"] span',
        '[data-section-id="REVIEWS_DEFAULT"] p',
        '[data-section-id="REVIEWS_DEFAULT"] div',
        '.reviews span',
        '.reviews p',
        '.review-text',
        '[data-testid="review-text"]',
        '[data-testid="review"] span',
        '[data-testid="review"] p',
        'span[dir="ltr"]', // Common pattern for review text
        'div[role="article"] span',
        'div[role="article"] p'
      ];

      // Try each selector and log results
      for (const selector of reviewSelectors) {
        const elements = $(selector);
        console.log(`Selector "${selector}" found ${elements.length} elements`);

        elements.each((_, element) => {
          const text = $(element).text().trim();

          // Look for text that looks like actual reviews
          if (text.length > 50 && text.length < 2000) {
            // Check for review-like content
            const hasReviewKeywords = text.includes('stay') || text.includes('place') ||
                                    text.includes('host') || text.includes('recommend') ||
                                    text.includes('beautiful') || text.includes('perfect') ||
                                    text.includes('amazing') || text.includes('lovely') ||
                                    text.includes('great') || text.includes('clean') ||
                                    text.includes('comfortable') || text.includes('enjoyed') ||
                                    text.includes('nice') || text.includes('good') ||
                                    text.includes('excellent') || text.includes('wonderful');

            // Make sure it's not metadata or navigation
            const isNotMetadata = !text.includes('stars') && !text.includes('rating') &&
                                !text.includes('Show more') && !text.includes('Show less') &&
                                !text.includes('reviews') && !text.includes('guests') &&
                                !text.match(/^\d+$/) && // Not just numbers
                                !text.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)/); // Not dates

            if (hasReviewKeywords && isNotMetadata && !seenReviews.has(text)) {
              reviews.push(text);
              seenReviews.add(text);
              console.log(`Found review ${reviews.length}: ${text.substring(0, 100)}...`);

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

      console.log(`Total reviews found: ${reviews.length}`);
      return reviews.slice(0, maxReviews);

    } catch (error) {
      console.error(`Scraping error: ${error.message}`);
      throw new Error(`Error scraping reviews: ${error.message}`);
    }
  }

  /**
   * Try to get reviews from Airbnb's API endpoints (alternative approach)
   */
  async tryApiApproach(listingId, maxReviews = 20) {
    const client = this.getHttpClient();

    try {
      // Try different API endpoints that Airbnb might use
      const apiUrls = [
        `https://www.airbnb.com/api/v3/StaysPdpSections?operationName=StaysPdpSections&locale=en&currency=USD&variables={"id":"${listingId}","pdpSectionsRequest":{"adults":"1","bypassTargetings":false,"categoryTag":null,"causeId":null,"children":null,"disasterId":null,"discountId":null,"guests":"1","infants":null,"layout":"SIDEBAR","pets":0,"pdpTypeOverride":null,"photoId":null,"preview":false,"previousStateCheckIn":null,"previousStateCheckOut":null,"priceDropSource":null,"privateBooking":false,"promotionUuid":null,"relaxedAmenityIds":null,"searchId":null,"selectedCancellationPolicyId":null,"selectedRatePlanId":null,"splitStays":null,"staysBookingMigrationEnabled":false,"translateUgc":null,"useNewSectionWrapperApi":false,"sectionIds":["REVIEWS_DEFAULT"],"checkIn":null,"checkOut":null}}&extensions={"persistedQuery":{"version":1,"sha256Hash":"some-hash"}}`,
        `https://www.airbnb.com/rooms/${listingId}/reviews.json`,
        `https://www.airbnb.com/api/v2/reviews?listing_id=${listingId}&role=all&_limit=${maxReviews}`
      ];

      for (const url of apiUrls) {
        try {
          console.log(`Trying API endpoint: ${url.substring(0, 100)}...`);
          const response = await client.get(url);

          if (response.data && typeof response.data === 'object') {
            // Try to extract reviews from different response formats
            const reviews = this.extractReviewsFromApiResponse(response.data);
            if (reviews.length > 0) {
              console.log(`API approach successful: ${reviews.length} reviews found`);
              return reviews.slice(0, maxReviews);
            }
          }
        } catch (apiError) {
          console.log(`API endpoint failed: ${apiError.message}`);
          continue;
        }
      }

      return [];
    } catch (error) {
      console.error(`API approach failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract reviews from various API response formats
   */
  extractReviewsFromApiResponse(data) {
    const reviews = [];

    // Try different paths where reviews might be stored
    const possiblePaths = [
      data.reviews,
      data.data?.reviews,
      data.data?.listing?.reviews,
      data.sections?.find(s => s.sectionId === 'REVIEWS_DEFAULT')?.section?.reviews,
      data.pdpSections?.find(s => s.sectionId === 'REVIEWS_DEFAULT')?.section?.reviews
    ];

    for (const reviewsArray of possiblePaths) {
      if (Array.isArray(reviewsArray)) {
        reviewsArray.forEach(review => {
          const text = review.comments || review.text || review.review || review.content;
          if (text && typeof text === 'string' && text.length > 50) {
            reviews.push(text);
          }
        });

        if (reviews.length > 0) {
          break;
        }
      }
    }

    return reviews;
  }

  /**
   * Complete scraping workflow with multiple approaches
   */
  async scrapeComplete(airbnbUrl, maxReviews = 20) {
    try {
      const listingId = this.extractListingId(airbnbUrl);
      console.log(`Starting scraping for listing ID: ${listingId}`);

      // Try API approach first (faster and more reliable)
      let reviews = await this.tryApiApproach(listingId, maxReviews);

      // If API approach fails, try HTML scraping
      if (reviews.length === 0) {
        console.log('API approach failed, trying HTML scraping...');
        reviews = await this.scrapeReviews(listingId, maxReviews);
      }

      // Get listing info
      let listingInfo;
      try {
        listingInfo = await this.scrapeListingInfo(listingId);
      } catch (error) {
        console.log('Failed to get listing info, using defaults');
        listingInfo = { title: 'Unknown Property', location: 'Unknown Location' };
      }

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
