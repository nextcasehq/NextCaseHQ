# NCHQ Module 20: Worker Deployment
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile && pnpm build --filter=workers
CMD ["pnpm", "start", "--filter", "workers"]
