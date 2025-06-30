const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  puppeteer = puppeteerCore;
}

class AirbnbScraper {
  constructor(options = {}) {
    this.defaultMaxReviews = options.maxReviews || 20;
    this.timeout = options.timeout || 30000;
    this.userAgent = options.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  /**
   * Extract listing ID from Airbnb URL
   * @param {string} url - Airbnb listing URL
   * @returns {string} - Listing ID
   */
  extractListingId(url) {
    const match = url.match(/\/rooms\/(\d+)/);
    if (!match) {
      throw new Error('Invalid Airbnb URL. Please provide a valid Airbnb listing URL.');
    }
    return match[1];
  }

  /**
   * Get browser launch options
   * @returns {Object} - Puppeteer launch options
   */
  getBrowserOptions() {
    return {
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
  }

  /**
   * Detect the platform and get appropriate Chrome path
   */
  getSystemChromePath() {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      case 'darwin':
        return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      case 'linux':
        // Try common Linux Chrome paths
        const linuxPaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/google-chrome-stable',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
          '/snap/bin/chromium'
        ];

        // Return the first path that exists
        const fs = require('fs');
        for (const path of linuxPaths) {
          try {
            if (fs.existsSync(path)) {
              return path;
            }
          } catch (error) {
            continue;
          }
        }
        return '/usr/bin/google-chrome'; // Default fallback
      default:
        return null;
    }
  }

  /**
   * Launch browser with fallback strategies
   * @returns {Object} - Browser instance
   */
  async launchBrowser() {
    const launchOptions = this.getBrowserOptions();

    // Try different browser launch strategies
    try {
      // First try: Use bundled Chromium from puppeteer
      console.log('Trying bundled Chromium from puppeteer...');
      return await puppeteer.launch(launchOptions);
    } catch (error) {
      console.log('Bundled Chromium failed:', error.message);
      try {
        console.log('Trying @sparticuz/chromium...');
        launchOptions.executablePath = await chromium.executablePath();
        launchOptions.args = [...chromium.args, ...launchOptions.args];
        launchOptions.defaultViewport = chromium.defaultViewport;
        return await puppeteerCore.launch(launchOptions);
      } catch (error2) {
        console.log('Sparticuz Chromium failed:', error2.message);
        console.log('Trying system Chrome...');

        // Use platform-appropriate Chrome path
        const systemChromePath = this.getSystemChromePath();
        if (systemChromePath) {
          launchOptions.executablePath = systemChromePath;
          console.log(`Using system Chrome at: ${systemChromePath}`);
          return await puppeteerCore.launch(launchOptions);
        } else {
          throw new Error('No Chrome executable found for this platform');
        }
      }
    }
  }

  /**
   * Scrape listing information (title and location)
   * @param {string} listingId - Airbnb listing ID
   * @returns {Object} - Listing info {title, location}
   */
  async scrapeListingInfo(listingId) {
    let browser;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      const listingUrl = `https://www.airbnb.com/rooms/${listingId}`;
      await page.goto(listingUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
      
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

  /**
   * Scrape reviews from Airbnb listing
   * @param {string} listingId - Airbnb listing ID
   * @param {number} maxReviews - Maximum number of reviews to scrape
   * @returns {Array} - Array of review texts
   */
  async scrapeReviews(listingId, maxReviews = this.defaultMaxReviews) {
    let browser;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent(this.userAgent);
      
      // Navigate to the reviews page
      const reviewsUrl = `https://www.airbnb.com/rooms/${listingId}/reviews`;
      await page.goto(reviewsUrl, { waitUntil: 'networkidle2', timeout: this.timeout });
      
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

  /**
   * Scrape both listing info and reviews
   * @param {string} airbnbUrl - Full Airbnb listing URL
   * @param {number} maxReviews - Maximum number of reviews to scrape
   * @returns {Object} - Complete scraping result
   */
  async scrapeComplete(airbnbUrl, maxReviews = this.defaultMaxReviews) {
    try {
      // Extract listing ID
      const listingId = this.extractListingId(airbnbUrl);
      
      // Get listing info and reviews in parallel for better performance
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
}

module.exports = AirbnbScraper;
