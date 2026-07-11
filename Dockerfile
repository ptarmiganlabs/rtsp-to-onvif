FROM node:22-alpine3.20

RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.20/main dhclient curl
ENV NODE_ENV=production
WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci --production --silent

COPY . .

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8081/ || exit 1

CMD ["node", "main.js", "/onvif.yaml"]
