# Script para actualizar la conexión a la base de datos de Railway

Write-Host "🔧 Actualizando conexión a base de datos de Railway..." -ForegroundColor Green

# URL de la base de datos de Railway
$DATABASE_URL = "postgresql://postgres:ZFKWXwmpvcDLeYHKzBXtFcNvIufMpZnX@switchback.proxy.rlwy.net:20794/railway"

# Crear o actualizar archivo .env
$envContent = @"
# Database
DATABASE_URL=$DATABASE_URL

# JWT Configuration
JWT_SECRET=encargate_super_secret_key_2024
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:3000
"@

# Guardar en .env
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -Force

Write-Host "✅ Archivo .env actualizado con la conexión de Railway" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ejecutar: npx prisma migrate deploy" -ForegroundColor Cyan
Write-Host "2. Ejecutar: npx prisma db seed" -ForegroundColor Cyan
Write-Host "3. Ejecutar: npm run start:dev" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔗 Base de datos: Railway PostgreSQL" -ForegroundColor Magenta
Write-Host "🌐 Backend: http://localhost:3001" -ForegroundColor Magenta
Write-Host "📚 API Docs: http://localhost:3001/api/docs" -ForegroundColor Magenta
