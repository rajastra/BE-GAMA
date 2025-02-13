# Stage 1: Build
FROM node:18 AS builder

WORKDIR /app

COPY . .

RUN npm install

# Stage 2: Runtime
FROM alpine:3.20 AS base

# Install Node.js and required dependencies
RUN apk add --no-cache nodejs npm tzdata && \
    ln -sf /usr/share/zoneinfo/Asia/Jakarta /etc/localtime && \
    echo "Asia/Jakarta" > /etc/timezone

WORKDIR /app

COPY --from=builder /app /
COPY --from=builder /app/node_modules /node_modules
COPY --from=builder /app/package.json /package.json

EXPOSE 3000

CMD ["node", "server.js"]
