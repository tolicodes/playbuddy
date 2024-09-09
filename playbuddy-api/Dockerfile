# Use the official Node.js image as the base image
FROM node:18-slim

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies including Puppeteer
RUN npm install

# Bundle app source code
COPY . .

RUN npm run build

RUN cat /usr/src/app/dist/app.js

# Expose the port on which your app will run
EXPOSE 8080

# Start the application
CMD ["npm", "start"]