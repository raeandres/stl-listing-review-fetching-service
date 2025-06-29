# Airbnb Top Reviews Scraping Service

A Node.js web service that scrapes Airbnb reviews and uses AI to select the top 3 most positive reviews for any Airbnb listing.

## Features

- 🔍 **Web Scraping**: Automatically scrape reviews from any Airbnb listing URL
- 🤖 **AI Analysis**: Use DeepSeek AI to intelligently select the top 3 most positive reviews
- 📊 **Review Management**: Store and retrieve analysis results
- 🚀 **RESTful API**: Easy-to-use HTTP endpoints
- ⚡ **Async Processing**: Non-blocking review analysis

## Prerequisites

- Node.js 14.0.0 or higher
- DeepSeek API key (for AI analysis)

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

3. Create a `.env` file in the root directory:

```env
DEEPSEEK_API_KEY=your_deepseek_api_key_here
PORT=3000
```

4. Start the service:

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

Scrapes reviews from an Airbnb listing and analyzes them to find the top 3 most positive reviews.

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
  "analysisId": "scrape_1",
  "status": "scraping",
  "message": "Starting to scrape Airbnb reviews and analyze for top positive reviews"
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

### 3. Submit Reviews for Analysis

**POST** `/api/analyze`

Analyze a list of reviews to find the top 3 most positive ones.

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

### 4. Get Analysis Results

**GET** `/api/analysis/:id`

Retrieve the results of a completed analysis.

**Response:**

```json
{
  "id": "scrape_1",
  "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
  "listingId": "12345678",
  "propertyName": "Beautiful Beach House",
  "location": "Miami Beach, FL",
  "status": "completed",
  "reviewCount": 15,
  "scrapedReviews": [...],
  "topReviews": "TOP 3 REVIEWS:\n\nREVIEW 1:\n[Most positive review]\n\nREVIEW 2:\n[Second most positive review]\n\nREVIEW 3:\n[Third most positive review]",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "completedAt": "2024-01-15T10:32:00.000Z"
}
```

### 5. List All Analyses

**GET** `/api/analyses`

Get a list of all analyses with their status.

### 6. Delete Analysis

**DELETE** `/api/analysis/:id`

Delete a specific analysis.

### 7. Health Check

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

2. **Check analysis status:**

```bash
curl http://localhost:3000/api/analysis/scrape_1
```

3. **Scrape reviews only:**

```bash
curl -X POST http://localhost:3000/api/scrape-reviews \
  -H "Content-Type: application/json" \
  -d '{
    "airbnbUrl": "https://www.airbnb.com/rooms/12345678",
    "maxReviews": 10
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
console.log("Analysis ID:", result.analysisId);

// Poll for results
const checkStatus = async (analysisId) => {
  const statusResponse = await fetch(
    `http://localhost:3000/api/analysis/${analysisId}`
  );
  const status = await statusResponse.json();

  if (status.status === "completed") {
    console.log("Top reviews:", status.topReviews);
  } else if (status.status === "error") {
    console.error("Error:", status.error);
  } else {
    // Still processing, check again in 2 seconds
    setTimeout(() => checkStatus(analysisId), 2000);
  }
};

checkStatus(result.analysisId);
```

## Configuration

### Environment Variables

- `DEEPSEEK_API_KEY`: Your DeepSeek API key for AI analysis
- `PORT`: Server port (default: 3000)

### Rate Limiting

The service includes built-in protection against excessive requests:

- Maximum 50 reviews per analysis request
- Automatic browser cleanup after each scraping session
- User agent rotation to avoid detection

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
- AI analysis requires a valid DeepSeek API key
- In-memory storage (use database for production)

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
