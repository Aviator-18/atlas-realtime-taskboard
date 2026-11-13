# Stage 1: Build static frontend assets
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies based on lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build
COPY . .
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_WS_URL=ws://localhost:8080/ws
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN npm run build

# Stage 2: Serve with non-root Nginx
FROM nginxinc/nginx-unprivileged:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
