# Dockerfile para NestJS Backend
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar prisma schema
COPY prisma ./prisma/

# Generar Prisma client
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Build de la aplicación
RUN npm run build

# Limpiar devDependencies después del build
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicio directo (sin script)
CMD ["sh", "-c", "echo '🚀 Iniciando aplicación...' && if [ -z \"$DATABASE_URL\" ]; then echo '❌ DATABASE_URL no configurada'; exit 1; fi && echo '✅ DATABASE_URL configurada' && echo '📦 Ejecutando migraciones...' && npx prisma migrate deploy || echo '⚠️ Migraciones fallaron, continuando...' && echo '🎯 Iniciando servidor...' && node dist/main"]
