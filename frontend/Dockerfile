# Development Dockerfile for Frontend
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=development

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

EXPOSE 3000

# Start dev server with hot reload
CMD ["npm", "run", "dev"]