# bit-frontend Dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
COPY package.json ./
COPY server.js ./
COPY --from=builder /app/dist ./dist
USER appuser
EXPOSE 3000
CMD ["node", "server.js"]
