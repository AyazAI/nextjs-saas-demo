FROM node:22-bookworm-slim

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://harborlane:harborlane@localhost:5432/harborlane?schema=public"

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --create-home --uid 1001 --shell /usr/sbin/nologin app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY --chown=app:app . .
RUN npx prisma generate \
  && npm run build \
  && chown -R app:app /app

USER app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
