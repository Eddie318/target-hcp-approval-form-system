FROM node:20-bullseye-slim
WORKDIR /usr/src/app

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
