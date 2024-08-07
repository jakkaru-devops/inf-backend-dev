# Stage 1: Build the application
FROM node:14.21.3-slim as builder

WORKDIR /usr/src/app

COPY package.json ./
COPY yarn.lock ./
COPY .env ./
RUN yarn install

COPY . .

RUN yarn build-dev

# Stage 2: Production
FROM node:14.21.3-slim as production

WORKDIR /usr/src/app

# Install Chrome for Puppeteer
RUN apt-get update && apt-get install curl gnupg -y \
  && curl --location --silent https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
  && apt-get update \
  && apt-get install chromium -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Copy the built app from the builder stage
COPY --from=builder /usr/src/app/dist/dev ./dist/dev

CMD ["node", "dist/dev/server.js"]