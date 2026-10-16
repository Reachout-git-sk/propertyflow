# Multi-stage build: stage 1 has every tool needed to BUILD the app (TypeScript, all
# dev packages). Stage 2 is the image that actually RUNS, and gets only the results.

# ---- Stage 1: build ----
FROM node:22-alpine AS build

# Prisma checks the OpenSSL version to pick the right database engine. Alpine has no
# OpenSSL by default, so Prisma would guess (and warn "failed to detect libssl").
RUN apk add --no-cache openssl

WORKDIR /app

# Copy only the package files first, so Docker can reuse the installed packages
# (a cached layer) when only source code changes
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate the Prisma Client for this platform, then compile TypeScript into dist/
RUN npx prisma generate && npm run build

# Remove dev packages (TypeScript, Jest...). The Prisma CLI stays, because it is a regular
# dependency: the container runs `prisma migrate deploy` every time it starts.
RUN npm prune --omit=dev

# ---- Stage 2: runtime ----
FROM node:22-alpine

RUN apk add --no-cache openssl

ENV NODE_ENV=production
# Stop the Prisma CLI from contacting Prisma's servers to check for updates on every start
ENV CHECKPOINT_DISABLE=1
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts

# Do not run as root. The official Node image has a "node" user for this.
RUN mkdir -p uploads logs && chown node:node uploads logs
USER node

EXPOSE 5000

# On every start: apply new migrations (as the owner, DATABASE_URL), let the restricted
# propertyflow_app role log in (row-level security), then start the API.
# node_modules/.bin/prisma is the Prisma CLI installed in the image (5.22.0, same as
# package-lock.json). Plain `npx prisma` could download a different version if it were missing.
# The middle step is the same script as `npm run db:app-role`, without starting npm.
# `exec` makes Node replace the shell, so `docker stop` reaches Node directly.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node scripts/set-app-db-password.js && exec node dist/server.js"]
