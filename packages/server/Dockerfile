FROM node:22-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY prisma/ prisma/
COPY tsconfig.json ./

RUN npm ci

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/server/ packages/server/
RUN npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
RUN npm run build -w packages/server

FROM node:22-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/

RUN npm ci --omit=dev

COPY prisma/ prisma/
RUN npx -w packages/server prisma generate --schema ../../prisma/schema.prisma

COPY --from=builder /app/packages/shared/dist/ packages/shared/dist/
COPY --from=builder /app/packages/server/dist/ packages/server/dist/

EXPOSE 3000

CMD ["node", "packages/server/dist/index.js"]
