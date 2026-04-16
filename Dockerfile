FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

RUN mkdir -p /app/uploads

VOLUME ["/app/uploads"]

EXPOSE 3000

CMD ["sh", "-c", "npm run db:push && npm run start"]
