# Use the official Node.js image as the base image
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

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
