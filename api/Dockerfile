# Stage 1: Install dependencies
FROM oven/bun:1.1.38-alpine AS deps

WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Stage 2: Build/compile TypeScript
FROM oven/bun:1.1.38-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun build server.ts --compile --outfile=server

# Stage 3: Final minimal image
FROM alpine:3.21

RUN apk add --no-cache python3 libgcc libstdc++

WORKDIR /app
COPY --from=builder /app/server ./server

EXPOSE 4000

CMD ["./server"]
