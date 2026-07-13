FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/admin/package.json packages/admin/
COPY packages/storefront/package.json packages/storefront/
COPY tsconfig.json ./

RUN npm ci

COPY packages/shared/ packages/shared/
RUN npm run build -w packages/shared

COPY packages/storefront/ packages/storefront/
RUN npm run build -w packages/storefront

FROM nginx:alpine

COPY --from=builder /app/packages/storefront/dist/ /usr/share/nginx/html/
COPY packages/storefront/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
