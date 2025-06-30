#!/bin/bash

# Render.com startup script for Airbnb Reviews Scraper

echo "🚀 Starting Airbnb Reviews Scraper on Render.com..."

# Check if Chrome is installed
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome found at: $(which google-chrome)"
    export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome)
elif command -v google-chrome-stable &> /dev/null; then
    echo "✅ Google Chrome Stable found at: $(which google-chrome-stable)"
    export PUPPETEER_EXECUTABLE_PATH=$(which google-chrome-stable)
elif command -v chromium-browser &> /dev/null; then
    echo "✅ Chromium found at: $(which chromium-browser)"
    export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser)
elif command -v chromium &> /dev/null; then
    echo "✅ Chromium found at: $(which chromium)"
    export PUPPETEER_EXECUTABLE_PATH=$(which chromium)
else
    echo "⚠️ No Chrome/Chromium found, will try bundled Chromium"
fi

# Set environment variables for Render.com
export NODE_ENV=production
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Display environment info
echo "📋 Environment Info:"
echo "   Node.js: $(node --version)"
echo "   Platform: $(uname -a)"
echo "   Chrome Path: $PUPPETEER_EXECUTABLE_PATH"

# Test Chrome installation
if [ ! -z "$PUPPETEER_EXECUTABLE_PATH" ]; then
    echo "🧪 Testing Chrome installation..."
    $PUPPETEER_EXECUTABLE_PATH --version 2>/dev/null && echo "✅ Chrome test successful" || echo "⚠️ Chrome test failed"
fi

# Start the application
echo "🎯 Starting Node.js application..."
exec npm start
