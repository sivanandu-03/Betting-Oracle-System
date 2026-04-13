FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN apk add --no-cache curl && npm install

COPY . .

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]
