FROM node:20-alpine
WORKDIR /usr/src/app

# Prisma engine for musl requires openssl 1.1 compatibility on alpine
RUN apk add --no-cache openssl1.1-compat

# Install workspaces dependencies
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mock/package.json apps/mock/package.json
RUN npm install

# Copy source
COPY . .

WORKDIR /usr/src/app/apps/api
RUN npm run build

CMD ["npm", "run", "start:dev"]
