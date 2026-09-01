FROM node:22-alpine AS build
WORKDIR /app
COPY apps/worker/package.json ./
RUN npm install
COPY apps/worker .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
