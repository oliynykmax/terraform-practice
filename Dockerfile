FROM oven/bun:1

WORKDIR /app

COPY public ./public
COPY server.js .

EXPOSE 3000

CMD ["bun", "server.js"]
