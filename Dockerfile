# ---- Build ----
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY tsconfig.json nest-cli.json ./
COPY src/ ./src/
RUN npm run build

# ---- Production ----
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy pre-built Prisma client (generated in build stage)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client

COPY --from=build /app/dist ./dist
COPY prisma/schema.prisma ./prisma/
COPY prisma/seed.cjs ./prisma/seed.cjs
COPY entrypoint.sh ./

RUN chown -R node:node /app && chmod +x entrypoint.sh

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/docs').then(r => process.exit(r.ok?0:1)).catch(() => process.exit(1))"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "dist/main"]
