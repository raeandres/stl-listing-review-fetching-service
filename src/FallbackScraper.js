const axios = require('axios');

class FallbackScraper {
  constructor() {
    this.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.timeout = 15000;
  }

  /**
   * Extract listing ID from URL
   */
  extractListingId(url) {
    const match = url.match(/\/rooms\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Airbnb URL');
    }
    return match[1];
  }

  /**
   * Get high-quality mock reviews based on listing ID
   */
  async getEnhancedMockReviews(listingId) {
    // Generate varied, realistic reviews based on listing ID
    const reviewTemplates = [
      {
        template: "Amazing {adjective} with {feature}! The host was {host_quality} and the {amenity} was {quality}. Would definitely {action} again!",
        variations: {
          adjective: ["place", "property", "location", "stay", "experience"],
          feature: ["stunning views", "great amenities", "perfect location", "beautiful surroundings", "excellent facilities"],
          host_quality: ["incredibly welcoming", "very helpful", "super responsive", "extremely kind", "wonderfully accommodating"],
          amenity: ["location", "cleanliness", "comfort", "atmosphere", "setup"],
          quality: ["perfect", "excellent", "outstanding", "fantastic", "amazing"],
          action: ["stay", "book", "visit", "recommend this place", "come back"]
        }
      },
      {
        template: "{quality} property in a {location_type}. Everything was {condition} and {maintenance}. The host provided {service} and the {aspect} exceeded our expectations.",
        variations: {
          quality: ["Beautiful", "Lovely", "Wonderful", "Perfect", "Excellent"],
          location_type: ["great location", "perfect spot", "ideal area", "fantastic neighborhood", "prime location"],
          condition: ["clean", "spotless", "immaculate", "pristine", "well-maintained"],
          maintenance: ["well-organized", "thoughtfully arranged", "carefully prepared", "professionally managed", "beautifully presented"],
          service: ["excellent recommendations", "helpful local tips", "outstanding support", "wonderful hospitality", "great communication"],
          aspect: ["overall experience", "attention to detail", "quality of amenities", "level of comfort", "standard of cleanliness"]
        }
      },
      {
        template: "Had the most {experience} stay! The {space} is {description} and the {feature} was {quality}. {recommendation} for anyone looking for {purpose}.",
        variations: {
          experience: ["amazing", "wonderful", "fantastic", "incredible", "memorable"],
          space: ["place", "property", "accommodation", "home", "space"],
          description: ["beautiful", "comfortable", "well-designed", "perfectly located", "thoughtfully decorated"],
          feature: ["host", "location", "cleanliness", "comfort", "amenities"],
          quality: ["exceptional", "outstanding", "perfect", "excellent", "top-notch"],
          recommendation: ["Highly recommend", "Would definitely recommend", "Perfect choice", "Excellent option", "Great pick"],
          purpose: ["a relaxing getaway", "a comfortable stay", "a memorable experience", "a perfect vacation", "quality accommodation"]
        }
      }
    ];

    const reviews = [];
    const usedCombinations = new Set();

    // Generate 5-8 unique reviews
    const numReviews = 5 + (parseInt(listingId) % 4); // 5-8 reviews based on listing ID
    
    for (let i = 0; i < numReviews; i++) {
      const template = reviewTemplates[i % reviewTemplates.length];
      let review = template.template;
      let combination = '';

      // Replace placeholders with random variations
      for (const [placeholder, options] of Object.entries(template.variations)) {
        const seedIndex = (parseInt(listingId) + i * 7 + placeholder.length) % options.length;
        const selectedOption = options[seedIndex];
        review = review.replace(`{${placeholder}}`, selectedOption);
        combination += selectedOption + '|';
      }

      // Ensure uniqueness
      if (!usedCombinations.has(combination)) {
        reviews.push(review);
        usedCombinations.add(combination);
      }
    }

    return reviews;
  }

  /**
   * Try to get basic listing info via HTTP
   */
  async getBasicListingInfo(listingId) {
    try {
      const client = axios.create({
        timeout: this.timeout,
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });

      const url = `https://www.airbnb.com/rooms/${listingId}`;
      const response = await client.get(url);
      
      // Try to extract title from HTML
      const titleMatch = response.data.match(/<title[^>]*>([^<]+)</i);
      let title = 'Airbnb Property';
      
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
        // Clean up title
        title = title.split(' - ')[0] || title;
        title = title.split(' | ')[0] || title;
        title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      }

      return {
        title: title,
        location: 'Location available on site'
      };
    } catch (error) {
      return {
        title: `Airbnb Listing ${listingId}`,
        location: 'Location not available'
      };
    }
  }

  /**
   * Complete fallback scraping
   */
  async scrapeComplete(airbnbUrl, maxReviews = 20) {
    try {
      const listingId = this.extractListingId(airbnbUrl);
      console.log(`Using fallback scraper for listing ${listingId}`);

      // Get basic info and enhanced mock reviews
      const [listingInfo, reviews] = await Promise.all([
        this.getBasicListingInfo(listingId),
        this.getEnhancedMockReviews(listingId)
      ]);

      return {
        listingId,
        propertyName: listingInfo.title,
        location: listingInfo.location,
        reviews: reviews.slice(0, maxReviews),
        reviewCount: Math.min(reviews.length, maxReviews),
        scrapedAt: new Date().toISOString(),
        source: 'fallback_enhanced_mock',
        note: 'Enhanced mock data generated due to scraping limitations'
      };

    } catch (error) {
      throw new Error(`Fallback scraper failed: ${error.message}`);
    }
  }
}

module.exports = FallbackScraper;
