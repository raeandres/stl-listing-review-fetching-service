# Render.com Deployment Guide

## 🚀 Deploy to Render.com

Render.com is perfect for this application because it supports Docker and Puppeteer/Chrome out of the box!

### Option 1: Docker Deployment (Recommended for Real Scraping)

1. **Push your code to GitHub**
2. **Go to [render.com](https://render.com) and sign up/login**
3. **Click "New +" → "Web Service"**
4. **Connect your GitHub repository**
5. **Configure the service:**

   - **Name**: `airbnb-reviews-scraper`
   - **Environment**: `Docker`
   - **Plan**: `Starter` (free tier)

6. **Render will automatically:**

   - Use your `Dockerfile`
   - Install Chrome properly
   - Set up the environment

7. **Click "Create Web Service"**

### Option 2: Node.js Deployment (Fallback Only)

If you prefer Node.js environment (will use fallback mock data):

1. **Environment**: `Node`
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables:**
   ```
   NODE_ENV=production
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ```

### Option 3: Using render.yaml (Infrastructure as Code)

1. **Add the `render.yaml` file to your repository**
2. **In Render.com, create a "Blueprint"**
3. **Connect your repository**
4. **Render will automatically use the configuration**

## 🔧 Key Fixes for Render.com

### 1. **Platform-Aware Chrome Detection**

The updated `AirbnbScraper.js` now detects the platform and uses the correct Chrome path:

- **Linux**: `/usr/bin/google-chrome` (Render.com uses Linux)
- **macOS**: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- **Windows**: `C:\Program Files\Google\Chrome\Application\chrome.exe`

### 2. **Chrome Installation in Docker**

The updated `Dockerfile` properly installs Chrome on Ubuntu:

```dockerfile
# Install Chrome and dependencies
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable
```

### 3. **Startup Script**

The `scripts/start-render.sh` script automatically detects and configures Chrome.

## 🧪 Testing Your Deployment

Once deployed, your service will be available at `https://your-app-name.onrender.com`:

```bash
# Replace with your actual Render URL
export RENDER_URL="https://your-app-name.onrender.com"

# Test health
curl $RENDER_URL/health

# Test scraping (should work with real data!)
curl -X POST $RENDER_URL/api/scrape-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbUrl": "https://www.airbnb.com/rooms/20669368",
    "maxReviews": 5
  }'

# Test analysis
curl -X POST $RENDER_URL/api/analyze \
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

## 🎯 Expected Results on Render.com

✅ **What WILL work:**

- Health endpoint
- Review analysis (perfect)
- Web scraping with Puppeteer (should work!)
- All API endpoints
- Real Airbnb review extraction

⚠️ **Potential limitations:**

- Airbnb may still block some requests
- Rate limiting from Airbnb
- Longer cold start times (free tier)

## 🔍 Debugging on Render.com

### Check Logs

1. Go to your service dashboard on Render.com
2. Click "Logs" tab
3. Look for Chrome detection messages:
   ```
   ✅ Google Chrome found at: /usr/bin/google-chrome
   🧪 Testing Chrome installation...
   ✅ Chrome test successful
   ```

### Test Chrome Installation

Use the debug endpoint:

```bash
curl -X POST $RENDER_URL/api/debug-scraping \
  -H "Content-Type: application/json" \
  -d '{"airbnbUrl": "https://www.airbnb.com/rooms/20669368"}'
```

## 💡 Render.com vs Other Platforms

| Platform       | Puppeteer Support | Chrome Installation | Deployment Ease | Cost         |
| -------------- | ----------------- | ------------------- | --------------- | ------------ |
| **Render.com** | ✅ Full           | ✅ Automatic        | ✅ Easy         | 💰 Free tier |
| Vercel         | ❌ Limited        | ❌ Not supported    | ✅ Easy         | 💰 Free tier |
| Heroku         | ✅ With buildpack | ⚠️ Manual setup     | ⚠️ Medium       | 💰💰 Paid    |
| Railway        | ✅ Full           | ✅ Automatic        | ✅ Easy         | 💰 Free tier |

## 🚀 Deployment Steps Summary

1. **Fix applied**: Updated Chrome detection for Linux
2. **Push to GitHub**: Commit all changes
3. **Deploy on Render**: Connect repository
4. **Configure environment**: Set environment variables
5. **Test**: Use the provided curl commands
6. **Monitor**: Check logs for any issues

Your scraping should now work properly on Render.com! 🎉
