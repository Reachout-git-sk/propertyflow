FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Start app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:app-role && npm start"]