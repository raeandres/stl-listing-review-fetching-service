# Airbnb Reviews Scraper

A simple, lightweight Node.js web service that scrapes Airbnb reviews and intelligently selects the top 5 most positive reviews for any Airbnb listing using content analysis.

## Features

- 🔍 **Web Scraping**: Automatically scrape reviews from any Airbnb listing URL
- � **Smart Analysis**: Content-based algorithm to select top 5 positive reviews
- **RESTful API**: Easy-to-use HTTP endpoints
- ⚡ **Direct Response**: Instant results, no complex async tracking
- 🎯 **No External Dependencies**: Self-contained service with no AI API requirements
- 🛡️ **Robust**: Built-in error handling and browser automation
- 💰 **Cost-Effective**: No API fees or usage limits
- 🔒 **Privacy-Focused**: All processing happens locally

## Prerequisites

- Node.js 14.0.0 or higher
- Chrome/Chromium browser (automatically detected)

## Quick Start

```bash
# Clone and install
git clone <repository-url>
cd stl-listing-review-fetching-service
npm install

# Start the service
npm start

# Test with an Airbnb listing
curl -X POST http://localhost:3000/api/scrape-and-analyze \
  -H "Content-Type: application/json" \
  -d '{"airbnbUrl": "https://www.airbnb.com/rooms/YOUR_LISTING_ID", "maxReviews": 10}'
```

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd stl-listing-review-fetching-service
```

2. Install dependencies:

```bash
npm install
```

3. Start the service:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

### 1. Scrape and Analyze Reviews

**POST** `/api/scrape-and-analyze`

Scrapes reviews from an Airbnb listing and analyzes them to find the top 5 most positive reviews.

**Request Body:**

```json
{
  "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
  "maxReviews": 20
}
```

**Response:**

```json
{
  "listingId": "12345678",
  "propertyName": "Beautiful Beach House",
  "location": "Miami Beach, FL",
  "allReviews": [
    "Amazing place with great views...",
    "Perfect location and clean...",
    "..."
  ],
  "topReviews": [
    "Amazing place with great views...",
    "Perfect location and clean...",
    "..."
  ],
  "totalReviews": 15,
  "topReviewsCount": 5,
  "analyzedAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Scrape Reviews Only

**POST** `/api/scrape-reviews`

Scrapes reviews from an Airbnb listing without AI analysis.

**Request Body:**

```json
{
  "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
  "maxReviews": 20
}
```

**Response:**

```json
{
  "listingId": "12345678",
  "propertyName": "Beautiful Beach House",
  "location": "Miami Beach, FL",
  "reviews": [
    "Amazing place with great views...",
    "Perfect location and clean...",
    "..."
  ],
  "reviewCount": 15,
  "scrapedAt": "2024-01-15T10:30:00.000Z"
}
```

### 3. Analyze Reviews

**POST** `/api/analyze`

Analyze a list of reviews to find the top 5 most positive ones.

**Request Body:**

```json
{
  "reviews": [
    "Amazing place with great views...",
    "Perfect location and clean...",
    "..."
  ],
  "propertyName": "Beautiful Beach House"
}
```

**Response:**

```json
{
  "propertyName": "Beautiful Beach House",
  "totalReviews": 10,
  "topReviews": [
    "Amazing place with great views...",
    "Perfect location and clean...",
    "..."
  ],
  "analyzedAt": "2024-01-15T10:30:00.000Z"
}
```

### 4. Health Check

**GET** `/health`

Check if the service is running.

## Usage Examples

### Using cURL

1. **Scrape and analyze reviews:**

```bash
curl -X POST http://localhost:3000/api/scrape-and-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
    "maxReviews": 20
  }'
```

2. **Scrape reviews only:**

```bash
curl -X POST http://localhost:3000/api/scrape-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
    "maxReviews": 10
  }'
```

3. **Analyze existing reviews:**

```bash
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "reviews": [
      "Amazing place with great views...",
      "Perfect location and clean...",
      "Wonderful host and beautiful property..."
    ],
    "propertyName": "Beautiful Beach House"
  }'
```

### Using JavaScript/Fetch

```javascript
// Scrape and analyze reviews
const response = await fetch("http://localhost:3000/api/scrape-and-analyze", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    airbnbUrl: "https://www.airbnb.com/rooms/12345678",
    maxReviews: 20,
  }),
});

const result = await response.json();
console.log("Property:", result.propertyName);
console.log("Total reviews:", result.totalReviews);
console.log("Top 5 reviews:", result.topReviews);
```

## How It Works

### Smart Review Selection Algorithm

The service uses a content-based scoring algorithm to select the top 5 reviews:

1. **Length Score**: Prefers reviews between 100-800 characters (optimal detail level)
2. **Positive Keywords**: Scores reviews containing positive words like "amazing", "excellent", "clean", "recommend", etc.
3. **Specific Details**: Rewards reviews mentioning specific amenities, host qualities, or location details
4. **Quality Filter**: Excludes metadata, ratings summaries, and duplicate content

### Configuration

#### Environment Variables

- `PORT`: Server port (default: 3000)

#### Built-in Protections

- Maximum 50 reviews per analysis request
- Automatic browser cleanup after each scraping session
- User agent rotation to avoid detection
- Robust error handling and timeouts

## Error Handling

The service handles various error scenarios:

- Invalid Airbnb URLs
- Network timeouts
- Missing reviews
- API rate limits
- Browser automation failures

## Security Considerations

- Uses headless browser with security flags
- Implements proper error handling
- Validates all input parameters
- Uses environment variables for sensitive data

## Limitations

- Requires valid Airbnb listing URLs
- Scraping may be affected by Airbnb's anti-bot measures
- Content-based analysis (no external AI dependency)
- Works best with listings that have multiple reviews

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.
