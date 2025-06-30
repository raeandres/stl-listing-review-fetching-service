const AirbnbScraper = require('./src/AirbnbScraper');
const FallbackScraper = require('./src/FallbackScraper');

async function testTimeoutFix() {
  console.log('🧪 Testing timeout fixes and fallback system...\n');

  // Test 1: Fallback scraper (should always work)
  console.log('1️⃣ Testing Fallback Scraper:');
  try {
    const fallbackScraper = new FallbackScraper();
    const fallbackResult = await fallbackScraper.scrapeComplete('https://www.airbnb.com/rooms/20669368', 5);
    console.log('✅ Fallback scraper works!');
    console.log(`   Property: ${fallbackResult.propertyName}`);
    console.log(`   Reviews: ${fallbackResult.reviewCount}`);
    console.log(`   First review: ${fallbackResult.reviews[0].substring(0, 100)}...`);
  } catch (error) {
    console.log('❌ Fallback scraper failed:', error.message);
  }

  console.log('\n2️⃣ Testing Main Scraper with Fallback:');
  try {
    const scraper = new AirbnbScraper({
      timeout: 30000, // 30 second timeout
      maxRetries: 2   // Only 2 retries for testing
    });
    
    const result = await scraper.scrapeComplete('https://www.airbnb.com/rooms/20669368', 5);
    console.log('✅ Main scraper completed!');
    console.log(`   Property: ${result.propertyName}`);
    console.log(`   Reviews: ${result.reviewCount}`);
    console.log(`   Method: ${result.scrapingMethod}`);
    console.log(`   Real data: ${result.debug?.realData}`);
    
    if (result.reviews && result.reviews.length > 0) {
      console.log(`   First review: ${result.reviews[0].substring(0, 100)}...`);
    }
    
  } catch (error) {
    console.log('❌ Main scraper failed:', error.message);
  }

  console.log('\n🎯 Test completed!');
}

// Run the test
testTimeoutFix().catch(console.error);
