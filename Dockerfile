FROM node:24-alpine3.24

RUN apk add --no-cache --repository=https://dl-cdn.alpinelinux.org/alpine/v3.20/main dhclient curl
ENV NODE_ENV=production
WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]
RUN npm ci --production --silent

COPY main.js ./
COPY src/ ./src/
COPY wsdl/ ./wsdl/
COPY resources/snapshot.png ./resources/snapshot.png

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -sf http://localhost:8081/ || exit 1

CMD ["node", "main.js", "/onvif.yaml"]
