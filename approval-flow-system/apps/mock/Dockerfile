FROM node:20-alpine
WORKDIR /usr/src/app

COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/mock/package.json apps/mock/package.json
RUN npm install

COPY . .

WORKDIR /usr/src/app/apps/mock
RUN npm run build

CMD ["npm", "run", "start:dev"]
