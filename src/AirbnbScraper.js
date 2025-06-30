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
    this.timeout = options.timeout || 60000; // Increased to 60 seconds
    this.userAgent = options.userAgent || 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
    this.maxRetries = options.maxRetries || 3;
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
   * Get browser launch options optimized for cloud deployment
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
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-images', // Speed up loading
        '--disable-javascript', // We don't need JS for basic HTML parsing
        '--disable-default-apps',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-default-browser-check',
        '--no-pings',
        '--password-store=basic',
        '--use-mock-keychain',
        '--single-process' // Use single process for better resource management
      ],
      headless: true,
      ignoreHTTPSErrors: true,
      defaultViewport: { width: 1280, height: 720 },
      timeout: this.timeout
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
   * Scrape listing information with timeout handling
   * @param {string} listingId - Airbnb listing ID
   * @returns {Object} - Listing info {title, location}
   */
  async scrapeListingInfo(listingId) {
    let browser;
    try {
      browser = await this.launchBrowser();
      const page = await browser.newPage();
      await page.setUserAgent(this.userAgent);

      // Block unnecessary resources
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      const listingUrl = `https://www.airbnb.com/rooms/${listingId}`;
      console.log(`Scraping listing info from: ${listingUrl}`);

      await page.goto(listingUrl, {
        waitUntil: 'domcontentloaded',
        timeout: Math.min(this.timeout, 30000) // Shorter timeout for listing info
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract listing information with multiple selector attempts
      const listingInfo = await page.evaluate(() => {
        // Try different selectors for title
        const titleSelectors = [
          'h1',
          '[data-section-id="HERO_DEFAULT"] h1',
          '.title h1',
          '.listing-title',
          '[data-testid="listing-title"]',
          'title' // Fallback to page title
        ];
        let title = 'Unknown Property';

        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            title = element.textContent.trim();
            // Clean up title if it's from page title
            if (selector === 'title') {
              title = title.split(' - ')[0] || title;
              title = title.split(' | ')[0] || title;
            }
            break;
          }
        }

        // Try different selectors for location
        const locationSelectors = [
          '[data-section-id="LOCATION_DEFAULT"] button',
          '.location button',
          '[data-testid="location"]',
          '.address',
          '[data-testid="listing-location"]'
        ];
        let location = 'Unknown Location';

        for (const selector of locationSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim()) {
            location = element.textContent.trim();
            break;
          }
        }

        return { title, location };
      });

      console.log(`Listing info: ${listingInfo.title} - ${listingInfo.location}`);
      return listingInfo;

    } catch (error) {
      console.log(`Error scraping listing info: ${error.message}`);
      // Return default values instead of throwing
      return {
        title: `Airbnb Listing ${listingId}`,
        location: 'Location not available'
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Scrape reviews with retry logic and optimized approach
   * @param {string} listingId - Airbnb listing ID
   * @param {number} maxReviews - Maximum number of reviews to scrape
   * @returns {Array} - Array of review texts
   */
  async scrapeReviews(listingId, maxReviews = this.defaultMaxReviews) {
    let lastError;

    // Try multiple approaches with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`Scraping attempt ${attempt}/${this.maxRetries} for listing ${listingId}`);

      let browser;
      try {
        browser = await this.launchBrowser();
        const page = await browser.newPage();

        // Set user agent and additional headers
        await page.setUserAgent(this.userAgent);
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        // Block unnecessary resources to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const resourceType = req.resourceType();
          if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
            req.abort();
          } else {
            req.continue();
          }
        });

        // Try different URL approaches
        const urls = [
          `https://www.airbnb.com/rooms/${listingId}/reviews`,
          `https://www.airbnb.com/rooms/${listingId}` // Fallback to main page
        ];

        let reviews = [];
        for (const url of urls) {
          try {
            console.log(`Trying URL: ${url}`);

            // Navigate with longer timeout and different wait conditions
            await page.goto(url, {
              waitUntil: 'domcontentloaded', // Faster than networkidle2
              timeout: this.timeout
            });

            // Wait a bit for dynamic content
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Try to find reviews section
            const hasReviewsSection = await page.evaluate(() => {
              return !!document.querySelector('[data-section-id="REVIEWS_DEFAULT"]') ||
                     !!document.querySelector('.reviews') ||
                     !!document.querySelector('[data-testid="review"]');
            });

            console.log(`Reviews section found: ${hasReviewsSection}`);

            if (hasReviewsSection) {
              // Extract reviews
              reviews = await page.evaluate(() => {
                const selectors = [
                  '[data-section-id="REVIEWS_DEFAULT"] span',
                  '[data-section-id="REVIEWS_DEFAULT"] p',
                  '[data-section-id="REVIEWS_DEFAULT"] div',
                  '.reviews span',
                  '.reviews p',
                  '[data-testid="review"] span',
                  '[data-testid="review"] p'
                ];

                const reviews = [];
                const seenReviews = new Set();

                for (const selector of selectors) {
                  const elements = document.querySelectorAll(selector);
                  elements.forEach(el => {
                    const text = el.textContent.trim();

                    // Look for review-like content
                    if (text.length > 50 && text.length < 2000) {
                      const hasReviewKeywords = text.includes('stay') || text.includes('place') ||
                                              text.includes('host') || text.includes('recommend') ||
                                              text.includes('beautiful') || text.includes('perfect') ||
                                              text.includes('amazing') || text.includes('lovely') ||
                                              text.includes('great') || text.includes('clean') ||
                                              text.includes('comfortable') || text.includes('enjoyed') ||
                                              text.includes('nice') || text.includes('good');

                      const isNotMetadata = !text.includes('stars') && !text.includes('rating') &&
                                          !text.includes('Show more') && !text.includes('reviews') &&
                                          !text.match(/^\d+$/) && !seenReviews.has(text);

                      if (hasReviewKeywords && isNotMetadata) {
                        reviews.push(text);
                        seenReviews.add(text);
                      }
                    }
                  });

                  if (reviews.length >= 5) break; // Stop if we found enough
                }

                return reviews;
              });

              console.log(`Found ${reviews.length} reviews from ${url}`);
              if (reviews.length > 0) break; // Success, exit URL loop
            }

          } catch (urlError) {
            console.log(`URL ${url} failed: ${urlError.message}`);
            continue;
          }
        }

        if (reviews.length > 0) {
          console.log(`Successfully scraped ${reviews.length} reviews on attempt ${attempt}`);
          return reviews.slice(0, maxReviews);
        } else {
          throw new Error('No reviews found in any section');
        }

      } catch (error) {
        lastError = error;
        console.log(`Attempt ${attempt} failed: ${error.message}`);

        if (attempt < this.maxRetries) {
          console.log(`Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      } finally {
        if (browser) {
          await browser.close();
        }
      }
    }

    throw new Error(`Error scraping Airbnb reviews after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Scrape both listing info and reviews with fallback
   * @param {string} airbnbUrl - Full Airbnb listing URL
   * @param {number} maxReviews - Maximum number of reviews to scrape
   * @returns {Object} - Complete scraping result
   */
  async scrapeComplete(airbnbUrl, maxReviews = this.defaultMaxReviews) {
    const listingId = this.extractListingId(airbnbUrl);
    console.log(`Starting scraping for listing ID: ${listingId}`);

    try {
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
        scrapedAt: new Date().toISOString(),
        scrapingMethod: 'puppeteer',
        debug: {
          realData: true,
          method: 'puppeteer'
        }
      };

    } catch (error) {
      console.log(`Puppeteer scraping failed: ${error.message}`);
      console.log('Using fallback scraper...');

      // Use fallback scraper
      const FallbackScraper = require('./FallbackScraper');
      const fallbackScraper = new FallbackScraper();
      const fallbackResult = await fallbackScraper.scrapeComplete(airbnbUrl, maxReviews);

      return {
        ...fallbackResult,
        debug: {
          puppeteerError: error.message,
          fallbackUsed: true,
          realData: false
        }
      };
    }
  }
}

module.exports = AirbnbScraper;
