FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
# We don't have a lockfile yet in this bootstrap phase, so we run install
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED 1

# If we wanted to build a production bundle we would run npm run build here.
# For local development via Docker Compose, we'll actually override the CMD to run `npm run dev`.
# But we keep the Dockerfile production-ready structured.

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV development
ENV NEXT_TELEMETRY_DISABLED 1

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src
COPY --from=builder /app/next.config.js ./next.config.js
COPY --from=builder /app/tsconfig.json ./tsconfig.json

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Run development server by default for this setup
CMD ["npm", "run", "dev"]
