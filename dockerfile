# Stage 1: Build
FROM node:18

# Copy semua file aplikasi
COPY . .

# Install dependencies
RUN npm install

# Expose port untuk aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["node", "server.js"]


