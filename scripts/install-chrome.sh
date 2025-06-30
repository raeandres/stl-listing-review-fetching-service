#!/bin/bash

echo "🔧 Installing Chrome for Render.com deployment..."

# Update package list
apt-get update

# Install dependencies
apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxkbcommon0 \
    libgtk-3-0

# Add Google Chrome repository
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add -
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google.list

# Update package list again
apt-get update

# Install Google Chrome
apt-get install -y google-chrome-stable

# Verify installation
if command -v google-chrome &> /dev/null; then
    echo "✅ Google Chrome installed successfully at: $(which google-chrome)"
    google-chrome --version
else
    echo "❌ Google Chrome installation failed"
    exit 1
fi

# Clean up
apt-get clean
rm -rf /var/lib/apt/lists/*

echo "🎉 Chrome installation completed!"
