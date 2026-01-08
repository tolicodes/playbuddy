# Use the official Node.js image as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# Ensure certs are available for sentry-cli HTTPS calls
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*
ENV SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt

# Allow passing a Sentry release at build time
ARG SENTRY_RELEASE
ENV SENTRY_RELEASE=${SENTRY_RELEASE}

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies including Puppeteer
RUN npm install

# Bundle app source code
COPY . .

RUN npm run build

# Expose the port on which your app will run
EXPOSE 8080

# Start the application
ENV NODE_ENV=production
CMD ["node", "./dist/app.js"]
