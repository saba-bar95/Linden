FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
# better-sqlite3 is optional (local SQLite only). Prod uses Neon Postgres.
RUN npm ci --omit=optional
COPY . .
ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "start"]
