FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/docs/package.json packages/docs/

RUN npm ci -w packages/docs

COPY packages/docs/ packages/docs/
RUN npm run build -w packages/docs

FROM nginx:alpine

COPY --from=builder /app/packages/docs/.vitepress/dist/ /usr/share/nginx/html/
COPY packages/docs/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
