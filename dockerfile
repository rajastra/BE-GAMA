# Stage 1: Build
FROM node:20 AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first for efficient caching
COPY package*.json ./

# Install dependencies
RUN npm install 

# Copy the rest of the application files
COPY . .

# Stage 2: Runtime
FROM alpine:3.20 AS base

# Install Node.js and required dependencies
RUN apk add --no-cache nodejs npm

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app /app
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

# Expose port (change if your Express app runs on a different port)
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
