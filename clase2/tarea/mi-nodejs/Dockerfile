# ---------- Stage: build ----------
FROM node:18-alpine AS build


WORKDIR /app


# Copiar sólo package.json y package-lock.json para aprovechar cache
COPY package*.json ./


# Instalar todas las dependencias (dev + prod) en la etapa de build
RUN npm install --production=false --no-audit --no-fund


# Copiar el resto del código
COPY . .


# Opcional: construir assets si hubiera (none for this simple app)


# ---------- Stage: production ----------
FROM node:18-alpine


# Crear grupo y usuario non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup


WORKDIR /app


# Copiar sólo dependencias de producción desde la etapa build
COPY --from=build /app/package*.json ./
RUN npm ci --only=production --no-audit --no-fund


# Copiar el código necesario desde el build
COPY --from=build /app/app.js ./


# Ajustar permisos
RUN chown -R appuser:appgroup /app


USER appuser


EXPOSE 3000


HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
CMD wget -qO- http://localhost:3000/health || exit 1


LABEL org.opencontainers.image.title="ejercicio1-nodejs-express" \
org.opencontainers.image.version="1.0.0" \
org.opencontainers.image.authors="Rainer Huber Gutierrez Pabon GTZ"


CMD ["node", "app.js"]
