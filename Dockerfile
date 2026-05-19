FROM oven/bun:1 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

FROM oven/bun:1-slim AS production

WORKDIR /app

RUN mkdir -p /data

COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
RUN bun install --production --frozen-lockfile

ENV DB_PATH=/data/app.db
ENV PORT=3000
ENV HOST=0.0.0.0

VOLUME ["/data"]
EXPOSE 3000

CMD ["bun", "run", "build/index.js"]
