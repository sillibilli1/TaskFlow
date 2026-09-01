FROM node:22-alpine AS build
WORKDIR /app
COPY apps/api/package.json ./
RUN npm install
COPY apps/api .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
EXPOSE 3000
USER node
CMD ["node", "dist/main.js"]
