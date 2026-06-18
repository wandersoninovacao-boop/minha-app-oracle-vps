FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY server.js ./
COPY app.js ./
COPY index.html ./
COPY styles.css ./
COPY data/ ./data/
COPY scripts/ ./scripts/
COPY public/ ./public/

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
