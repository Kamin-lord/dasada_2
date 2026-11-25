FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY server ./server
COPY public ./public

# Ma'lumotlar papkasini yaratamiz
RUN mkdir -p /app/data

ENV PORT=4000
EXPOSE 4000

CMD ["node", "--no-warnings", "server/index.js"]