# Dockerfile (optimizado)

# Stage 1: Build
FROM node:18 AS build
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src

# Stage 2: Production (alpine)
FROM node:18-alpine

# Labels de metadata
LABEL maintainer="tu-nombre" \
      version="1.0-optimizado" \
      description="Nueva app Node + MongoDB optimizada para seguridad y tamaño" \
      security.scan="trivy" \
      security.non-root="true"

# Variables de entorno recomendadas
ENV NODE_ENV=production \
    PORT=3000 \
    MONGO_URI=mongodb://mongo:27017/appdb

# Usuario non-root
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

WORKDIR /app
# Copiamos solo lo necesario para runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY package.json ./package.json

# Permisos
RUN chown -R appuser:appgroup /app

# Healthcheck (usa wget de busybox en alpine)
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

USER appuser
EXPOSE 3000
CMD ["node", "src/server.js"]