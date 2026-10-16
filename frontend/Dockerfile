# Multi-stage build: stage 1 uses Node to turn the React code into plain HTML, CSS and
# JavaScript files. Stage 2 is a small nginx web server that only serves those files.

# ---- Stage 1: build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite writes VITE_API_URL into the JavaScript files WHILE BUILDING, so it has to be known
# now (a build argument), not when the container starts. Changing it needs a rebuild.
# The default "/api" means "the same server that served this page": nginx (below) forwards
# /api to the backend, so the browser never needs to know where the backend lives.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Type-checks with tsc, then bundles into dist/
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.30-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
