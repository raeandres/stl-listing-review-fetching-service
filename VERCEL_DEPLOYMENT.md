# Vercel Deployment Guide

## 🚀 Quick Deploy to Vercel

### Option 1: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name: airbnb-reviews-scraper
# - Directory: ./
# - Override settings? N
```

### Option 2: Deploy via GitHub
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect the configuration

## 📁 Vercel-Specific Files

### `/vercel.json`
- Configures serverless functions
- Sets up routing
- Defines function timeouts

### `/api/` Directory
- `health.js` - Health check endpoint
- `analyze.js` - Review analysis endpoint
- `scrape-reviews.js` - Review scraping endpoint
- `scrape-and-analyze.js` - Combined scraping and analysis

### `/src/VercelAirbnbScraper.js`
- HTTP-based scraper (no Puppeteer)
- Uses axios + cheerio for parsing
- Includes fallback mock data

## 🔧 Key Differences from Local Version

### 1. **No Puppeteer/Chrome**
- Vercel doesn't support browser automation
- Uses HTTP requests + HTML parsing instead
- Includes mock data as fallback

### 2. **Serverless Functions**
- Each endpoint is a separate function
- No persistent server state
- 60-second timeout limit

### 3. **Limited Scraping**
- Airbnb may block HTTP-only requests
- Mock data provided for demonstration
- Real scraping works better on traditional servers

## 🧪 Testing Your Deployment

### Health Check
```bash
curl https://your-app.vercel.app/health
```

### Analyze Reviews
```bash
curl -X POST https://your-app.vercel.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "reviews": [
      "Amazing place with great views!",
      "Perfect location and very clean!",
      "Wonderful host and beautiful property!"
    ],
    "propertyName": "Test Property"
  }'
```

### Scrape Reviews (with fallback)
```bash
curl -X POST https://your-app.vercel.app/api/scrape-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
    "maxReviews": 5
  }'
```

## 🚨 Limitations on Vercel

1. **Web Scraping Challenges**:
   - No browser automation (Puppeteer)
   - Airbnb may block HTTP requests
   - Rate limiting and anti-bot measures

2. **Serverless Constraints**:
   - 60-second function timeout
   - No persistent state
   - Cold start delays

3. **Recommended Use Cases**:
   - Review analysis (works perfectly)
   - API demonstration
   - Development/testing

## 💡 Production Recommendations

For production web scraping, consider:

1. **Traditional Server Deployment**:
   - Use Docker + VPS/cloud server
   - Full Puppeteer support
   - Better scraping reliability

2. **Hybrid Approach**:
   - Vercel for analysis API
   - Separate scraping service
   - Queue-based processing

3. **Alternative Platforms**:
   - Railway.app (supports Puppeteer)
   - Render.com (Docker support)
   - Google Cloud Run

## 🔗 Useful Links

- [Vercel Documentation](https://vercel.com/docs)
- [Serverless Functions Guide](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Vercel CLI Reference](https://vercel.com/docs/cli)

## 🎯 Next Steps

1. Deploy to Vercel using one of the methods above
2. Test the endpoints with the provided examples
3. For production scraping, consider the traditional server approach
4. Use the analysis features which work perfectly on Vercel
