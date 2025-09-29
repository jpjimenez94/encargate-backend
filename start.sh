#!/bin/bash

echo "🚀 Iniciando aplicación Encárgate..."

# Verificar que DATABASE_URL esté configurada
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL no está configurada"
    echo "Por favor configura la variable de entorno DATABASE_URL en Railway"
    exit 1
fi

echo "✅ DATABASE_URL configurada"

# Intentar ejecutar migraciones
echo "📦 Ejecutando migraciones de Prisma..."
if npx prisma migrate deploy; then
    echo "✅ Migraciones ejecutadas exitosamente"
else
    echo "⚠️ Error en migraciones, continuando sin ellas..."
fi

# Iniciar la aplicación
echo "🎯 Iniciando servidor NestJS..."
node dist/main
