FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev --ignore-scripts --no-audit --no-fund

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
COPY .env.example ./.env.example
COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 4000

CMD ["/app/entrypoint.sh"]
