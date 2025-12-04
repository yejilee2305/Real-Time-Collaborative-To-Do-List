# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install dependencies
RUN npm ci --workspace=@sync/shared --workspace=@sync/backend

# Copy source code
COPY shared ./shared
COPY backend ./backend

# Build shared first, then backend
RUN npm run build --workspace=@sync/shared
RUN npm run build --workspace=@sync/backend

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy package files for production install
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY shared/package*.json ./shared/

# Install production dependencies only
RUN npm ci --workspace=@sync/shared --workspace=@sync/backend --omit=dev

# Copy built files
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist

# Copy migrations
COPY backend/migrations ./backend/migrations

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Run the application
CMD ["node", "backend/dist/index.js"]
