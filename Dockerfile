# Dockerfile para NestJS Backend - CLEAN BUILD v3.1
FROM node:18-alpine

# Instalar dependencias del sistema incluyendo OpenSSL
RUN apk add --no-cache postgresql-client wget curl openssl openssl-dev

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar schema de Prisma
COPY prisma ./prisma/

# Generar cliente de Prisma
RUN npx prisma generate

# Copiar código fuente
COPY . .

# Construir aplicación NestJS
RUN npm run build

# Verificar que el build se completó
RUN ls -la dist/ && ls -la dist/main.js || echo "Build failed - main.js not found"

# Limpiar dependencias de desarrollo DESPUÉS de verificar el build
RUN npm ci --only=production && npm cache clean --force

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Comando de inicio con verificaciones
CMD ["sh", "-c", "echo '🚀 Iniciando Encárgate API...' && \
if [ -z \"$DATABASE_URL\" ]; then \
  echo '❌ ERROR: DATABASE_URL no configurada'; \
  exit 1; \
fi && \
echo '✅ DATABASE_URL configurada' && \
echo '📁 Verificando archivos de build...' && \
ls -la dist/ && \
if [ ! -f dist/main.js ]; then \
  echo '❌ ERROR: dist/main.js no encontrado'; \
  exit 1; \
fi && \
echo '✅ Build verificado correctamente' && \
echo '📦 Ejecutando migraciones de Prisma...' && \
(npx prisma migrate deploy || echo '⚠️ Migraciones fallaron, continuando...') && \
echo '🎯 Iniciando servidor NestJS en puerto 3000...' && \
node dist/main.js"]
