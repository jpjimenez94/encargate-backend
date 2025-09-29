# Dockerfile para NestJS Backend
FROM node:18-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Generar Prisma client
RUN npx prisma generate

# Build de la aplicación
RUN npm run build

# Exponer puerto
EXPOSE 3001

# Comando de inicio
CMD ["npm", "run", "start:prod"]
