# Use Node.js image (Ubuntu-based for better Chrome support)
FROM node:20-bullseye-slim

# Copy Chrome installation script
COPY scripts/install-chrome.sh /tmp/install-chrome.sh

# Install Chrome using the script
RUN chmod +x /tmp/install-chrome.sh && /tmp/install-chrome.sh

# Tell Puppeteer to use installed Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]