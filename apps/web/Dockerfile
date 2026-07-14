# NCHQ Module 20: Web Deployment
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build --filter=web
CMD ["pnpm", "start", "--filter", "web"]
