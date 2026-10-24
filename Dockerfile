# Build stage
FROM node:24-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Vite inlines VITE_* at build time; runtime env on the nginx container has no effect
ARG VITE_API_URL=/api
ARG VITE_SERVER_ORIGIN
ARG VITE_RECAPTCHA_KEY
ENV VITE_API_URL=$VITE_API_URL \
    VITE_SERVER_ORIGIN=$VITE_SERVER_ORIGIN \
    VITE_RECAPTCHA_KEY=$VITE_RECAPTCHA_KEY

RUN pnpm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config if needed (for SPA routing and API proxying)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
