# Build from the repo root (the API imports ../shared):  docker build -f api/Dockerfile -t portfolio-api .
FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY shared ./shared
COPY api/package.json api/pnpm-lock.yaml ./api/
RUN cd api && pnpm install --frozen-lockfile --prod
COPY api ./api
WORKDIR /app/api
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
CMD ["pnpm", "start"]
