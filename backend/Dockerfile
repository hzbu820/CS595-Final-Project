# ---- build stage ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY artifacts ./artifacts 
COPY src ./src
RUN npm run build   # -> compiles to /app/dist

# ---- runtime stage ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/artifacts ./artifacts
RUN mkdir -p /app/storage
EXPOSE 4000
CMD ["node", "dist/server.js"] 
