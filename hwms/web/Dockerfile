FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# Retries and a longer timeout, because a build that fails on one slow tarball
# is a build people learn to run twice. --no-audit and --no-fund remove two
# network round trips that contribute nothing to the image.
RUN npm ci --no-audit --no-fund \
      --fetch-retries=5 \
      --fetch-retry-mintimeout=20000 \
      --fetch-retry-maxtimeout=180000 \
      --fetch-timeout=600000

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
